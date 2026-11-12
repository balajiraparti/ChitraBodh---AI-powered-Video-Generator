import Link from 'next/link';
import {useEffect,useState} from 'react';
import {currentOwner,services} from '../server/auth.mjs';
import {projectPage} from '../server/library.mjs';

export async function getServerSideProps({req,res}){
  res.setHeader('Cache-Control','private, no-store');
  const owner=await currentOwner(req);
  if(!owner)return {redirect:{destination:'/sign-in',permanent:false}};
  const initial=await projectPage(await services(),owner);
  return {props:{initial}};
}
const stages={planning:'Planning',narration:'Creating narration',animating:'Animating',finishing:'Finishing'};
const labels={draft:'Draft',queued:'Queued',ready:'Ready',expired:'Expired',failed:'Generation failed',cancelled:'Cancelled'};
export default function Library({initial}){
  return <LibraryView key={initial.serverNow} initial={initial}/>;
}
function LibraryView({initial}){
  const [items,setItems]=useState(initial.items);
  const [page,setPage]=useState(initial.page);
  const [now,setNow]=useState(Date.parse(initial.serverNow));
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [refreshError,setRefreshError]=useState(false);
  useEffect(()=>{
    const deadlines=items.filter(item=>item.state==="ready").map(item=>Date.parse(item.expiresAt)).filter(time=>time>now);
    const tick=()=>setNow(Date.now());
    const timer=deadlines.length?setTimeout(tick,Math.max(0,Math.min(...deadlines)-Date.now())):null;
    window.addEventListener("focus",tick);
    return ()=>{clearTimeout(timer);window.removeEventListener("focus",tick);};
  },[items,now]);
  const activeIds=items.filter(item=>['queued','running'].includes(item.state)).map(item=>item.jobId).join(',');
  useEffect(()=>{
    if(!activeIds)return;
    let stopped=false,timer;
    async function refresh(){
      try{
        const updates=await Promise.all(activeIds.split(',').map(async id=>{
          const response=await fetch('/api/v1/jobs/'+id);
          if(!response.ok)throw Error();
          return response.json();
        }));
        if(stopped)return;
        setRefreshError(false);
        setItems(list=>list.map(item=>{
          const job=updates.find(update=>update.jobId===item.jobId);
          if(!job)return item;
          const state=job.state==='succeeded'?(job.mediaAvailable?'ready':'expired'):job.state;
          return {...item,state,stage:job.stage,cancelRequested:job.cancelRequested,expiresAt:job.expiresAt ?? null};
        }));
      }catch{if(!stopped)setRefreshError(true);}
      if(!stopped)timer=setTimeout(refresh,4000);
    }
    timer=setTimeout(refresh,2000);
    return ()=>{stopped=true;clearTimeout(timer);};
  },[activeIds]);
  async function loadMore(){
    if(loading||!page.nextCursor)return;
    setLoading(true);setError('');
    try{
      const response=await fetch('/api/projects?cursor='+encodeURIComponent(page.nextCursor));
      if(response.status===400){setError('This list has changed. Refresh the page to start again.');return;}
      if(!response.ok)throw Error();
      const next=await response.json();
      setItems(current=>[...current,...next.items.filter(row=>!current.some(item=>item.id===row.id))]);
      setPage(next.page);
    }catch{setError('Could not load more videos. Try again.');}
    finally{setLoading(false);}
  }
  if(items.length)return <>
    <div className="library-heading"><h1>My videos</h1><Link className="action" href="/create?new=1">Create a video</Link></div>
    {refreshError&&<p role="status">Could not refresh progress. Reconnecting…</p>}
    <p>Videos are available for two hours after they are ready. Download before they expire.</p><ul className="project-list">{items.map(item=>{
      const state=item.state==='ready' && Date.parse(item.expiresAt)<=now?'expired':item.state;
      const status=state==='running'?(item.cancelRequested?'Stopping creation':stages[item.stage]||'Creating video'):labels[state]||state;
      const href=item.jobId?'/jobs/'+item.jobId:'/create?draft='+item.id;
      return <li key={item.id}><div><small className="state-chip">{status}</small><h2>{item.topic}</h2><div className="library-frame">{state==='ready' && item.mediaUrl?<video preload="metadata" muted playsInline src={item.mediaUrl+"#t=0.1"}/>:<div className="frame-status"><span className="material-symbols-outlined" aria-hidden="true">{state==='expired'?'timer_off':state==='draft'?'edit_note':state==='failed'?'error':'hourglass_top'}</span><strong>{status}</strong><small>{state==='expired'?'The two-hour availability window has ended.':state==='draft'?'Your idea is saved.':'Your idea stays saved here.'}</small></div>}</div>
        {item.expiresAt&&<p>{state==='expired'?'Expired':'Available until'} <time dateTime={item.expiresAt}>{item.expiresAt.slice(0,16).replace('T',' ')} UTC</time></p>}
      </div><Link href={href}>{state==='draft'?'Open draft':state==='ready'?'Review video':state==='expired'?'View expired video':'View job'}</Link></li>;
    })}</ul>
    {page.hasMore&&<button className="action" onClick={loadMore} disabled={loading}>{loading?'Loading…':'Load more'}</button>}
    {error&&<p role="alert">{error}</p>}
  </>;
  return <><h1>My videos</h1><div className="library-grid"><section className="empty">
    <img src="/empty-project.svg" width="48" height="48" alt=""/>
    <h2>Your first explanation starts with an idea.</h2><p>Start with a topic. Your finished videos will appear here.</p>
    <Link className="action" href="/create?new=1">Create your first explainer</Link></section><aside className="studio-note"><h2>Canvas preview</h2><div className="empty-frames" aria-hidden="true"><i/><i/></div><h2>Video availability</h2><p>Your videos are available for two hours after they are ready. Download a copy to keep it.</p><Link href="/preview">View the workspace example →</Link></aside></div></>;
}
