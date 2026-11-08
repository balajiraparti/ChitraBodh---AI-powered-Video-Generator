import React,{useEffect,useState} from 'react';
import Link from 'next/link';
import {currentOwner,services} from '../../server/auth.mjs';
import {jobStatus} from '../../server/job-status.mjs';

export async function getServerSideProps({req,res,params}){
  res.setHeader('Cache-Control','private, no-store');
  const ownerId=await currentOwner(req);
  if(!ownerId)return {redirect:{destination:'/sign-in',permanent:false}};
  const store=await services();
  const job=await store.jobs.findOne({_id:params.id,ownerId});
  return job?{props:{initial:await jobStatus(store,job)}}:{notFound:true};
}
const stages={queued:'Queued',planning:'Planning',narration:'Creating narration',animating:'Animating',finishing:'Finishing'};
export default function Job({initial}){
  return <Progress key={initial.jobId} initial={initial}/>;
}
function Progress({initial}){
  const [job,setJob]=useState(initial);
  const [error,setError]=useState('');
  const [confirm,setConfirm]=useState(false);
  const [busy,setBusy]=useState(false);
  const active=['queued','running'].includes(job.state);
  useEffect(()=>{
    if(!active)return;
    let stopped=false;
    let timer;
    async function refresh(){
      try{
        const response=await fetch(job.statusUrl);
        if(!response.ok)throw Error();
        const next=await response.json();
        if(!stopped){setJob(next);setError('');}
      }catch{if(!stopped)setError('Could not refresh progress. Reconnecting…');}
      if(!stopped)timer=setTimeout(refresh,2000);
    }
    timer=setTimeout(refresh,1000);
    return ()=>{stopped=true;clearTimeout(timer)};
  },[job.statusUrl,active]);
  useEffect(()=>{
    if(!job.mediaAvailable || !job.expiresAt)return;
    function expire(){
      if(Date.now()>=Date.parse(job.expiresAt))setJob(current=>({...current,mediaAvailable:false,mediaUrl:null}));
    }
    const timer=setTimeout(expire,Math.max(0,Date.parse(job.expiresAt)-Date.now()));
    window.addEventListener('focus',expire);
    return ()=>{clearTimeout(timer);window.removeEventListener('focus',expire);};
  },[job.expiresAt,job.mediaAvailable]);
  const expired=job.state==='succeeded' && !job.mediaAvailable;
  async function cancel(){
    setBusy(true);
    try{
      const response=await fetch(job.statusUrl,{method:'DELETE'});
      if(!response.ok)throw Error();
      setJob(await response.json());setConfirm(false);
    }catch{setError('Could not confirm cancellation. Try again.');}
    finally{setBusy(false);}
  }
  return <><h1>{active?'Creating your video':expired?'Your video has expired':job.state==='succeeded'?'Your video is ready':job.state==='cancelled'?'Creation cancelled':'Generation failed'}</h1>
    <section>
      <p role="status">{job.cancelRequested&&active?'Stopping creation…':active?stages[job.stage]||'Queued':job.safeError||''}</p>
      {active && <><ol>{Object.entries(stages).map(([key,label])=><li key={key} aria-current={job.stage===key?'step':undefined}>{label}</li>)}</ol><p>You can leave this page. We’ll keep working.</p></>}
      {expired && <><p>The availability window has ended. Your original topic is saved.</p><Link href="/create">Create another video</Link></>}
      <p role="alert">{error}</p>
      {active&&!job.cancelRequested && (confirm?<div><p>Stop creating this video? Your idea will be saved.</p><button disabled={busy} onClick={cancel}>Stop creation</button><button disabled={busy} onClick={()=>setConfirm(false)}>Keep creating</button></div>:<button onClick={()=>setConfirm(true)}>Cancel creation</button>)}
      {!active&&job.state!=='succeeded'&&<Link href={'/create?draft='+job.projectId}>Open saved idea</Link>}
      <p><Link href="/dashboard">My videos</Link></p>
    </section></>;
}
