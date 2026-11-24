import React,{useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {currentOwner,services} from '../../server/auth.mjs';
import {jobStatus} from '../../server/job-status.mjs';
export async function getServerSideProps({req,res,params}){
  res.setHeader('Cache-Control','private, no-store');
  const ownerId=await currentOwner(req);if(!ownerId)return {redirect:{destination:'/sign-in',permanent:false}};
  const store=await services(),job=await store.jobs.findOne({_id:params.id,ownerId,state:'succeeded'});
  if(!job?.artifactId)return {notFound:true};
  const version=await store.versions.findOne({_id:job.versionId,ownerId});
  return {props:{job:await jobStatus(store,job),artifactId:job.artifactId,versionNumber:version?.number??1}};
}
const states={queued:'Waiting to publish',preparing:'Preparing your Reel',processing:'Instagram is processing your video',publishing:'Publishing to Instagram',published:'Published on Instagram',outcome_unknown:'Checking the publishing result',needs_attention:'Publishing needs attention',failed:'This request did not publish',failed_confirmed:'Instagram confirmed publishing failed'};
const reasons={RECONNECT_REQUIRED:'Connect or reconnect Instagram in Settings to continue.',MEDIA_EXPIRED:'This video has expired. Create a new video from your saved idea.',TOO_CLOSE_TO_EXPIRY:'Posting requires at least five minutes before this video expires.',PUBLISHING_NOT_CONFIGURED:'Publishing needs a configured HTTPS address. Contact your administrator.'};
export default function Publish({job,artifactId,versionNumber}){
  const [info,setInfo]=useState(null),[error,setError]=useState(''),[caption,setCaption]=useState(''),[confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[uncertain,setUncertain]=useState(false);
  const command=useRef(null),submitting=useRef(false);
  const [history,setHistory]=useState([]),[cursor,setCursor]=useState(undefined);
  useEffect(()=>{setConfirmed(false)},[info?.connection?.id,info?.connection?.revision]);
  async function refresh(){const res=await fetch('/api/v1/publication-eligibility?artifactId='+encodeURIComponent(artifactId));if(!res.ok)throw Error();const value=await res.json();setInfo(value);return value;}
  useEffect(()=>{let stopped=false,timer;async function poll(){try{const res=await fetch('/api/v1/publication-eligibility?artifactId='+encodeURIComponent(artifactId));if(!res.ok)throw Error();const data=await res.json();if(!stopped)setInfo(data);}catch{if(!stopped)setError('Could not refresh publishing status. Try again.');}if(!stopped)timer=setTimeout(poll,5000);}poll();return()=>{stopped=true;clearTimeout(timer)};},[artifactId]);
  const publication=info?.publication;
  const blocked=publication&&!['failed','failed_confirmed'].includes(publication.state);
  const count=[...caption].length;
  async function publish(){
    if(submitting.current)return;
    submitting.current=true;setBusy(true);setError('');
    command.current??={key:crypto.randomUUID(),body:{artifactId,connectionId:info.connection.id,description:caption,mode:'now',confirmed:true}};
    try{
      const response=await fetch('/api/v1/publications',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':command.current.key},body:JSON.stringify(command.current.body)});
      const result=await response.json();
      if(response.ok||result.error?.code==='PUBLICATION_EXISTS'){setInfo(v=>({...v,publication:response.ok?result:result.publication}));setUncertain(false);command.current=null;setConfirmed(false);return;}
      if(response.status>=500){setUncertain(true);setError('We could not confirm receipt. Retry this same request to check safely.');return;}
      setError(reasons[result.error?.code]??(response.status===429?'Too many requests. Wait a minute and try again.':'The request could not be accepted. Refresh the account and video details.'));command.current=null;setUncertain(false);setConfirmed(false);await refresh();
    }catch{setUncertain(true);setError('We could not confirm receipt. Retry this same request to check safely.');}
    finally{submitting.current=false;setBusy(false);}
  }
  async function check(){setBusy(true);try{const res=await fetch('/api/v1/publications/'+publication.id+'/check',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});if(!res.ok)throw Error();await refresh();setError('');}catch{setError('Could not request a status check. Please try again.');}finally{setBusy(false);}}
  async function more(){setBusy(true);try{const res=await fetch('/api/v1/publications?artifactId='+encodeURIComponent(artifactId)+'&limit=20'+(cursor?'&cursor='+encodeURIComponent(cursor):''));if(!res.ok)throw Error();const page=await res.json();setHistory(old=>[...old,...page.items.filter(item=>!old.some(o=>o.id===item.id))]);setCursor(page.page.nextCursor);}catch{setError('Could not load publishing history. Try again.');}finally{setBusy(false);}}
  return <><Link href={'/jobs/'+job.jobId}>← Back to video</Link><h1>Share to Instagram</h1><p>One clear idea. Ready for your audience.</p>
    <div className="publish-grid"><section className="publish-preview"><h2>Your Reel</h2>{job.mediaAvailable&&info?.reason!=='MEDIA_EXPIRED'?<video controls playsInline preload="metadata" src={job.mediaUrl} aria-label="Video to publish"/>:<p>The local video is no longer available.</p>}<p>Version {versionNumber} · Captions {job.captions?'on':'off'} · Vertical Reel</p>{job.expiresAt&&<p>Available until <time dateTime={job.expiresAt}>{new Date(job.expiresAt).toISOString().slice(0,16).replace('T',' ')} UTC</time></p>}</section>
    <section className="publish-details"><h2>Destination</h2>{info?.connection?<p className="publish-account">@{info.connection.username} <small>Instagram · {info.connection.status==='connected'?'Connected':'Reconnect required'}</small></p>:<p>Connect your Instagram professional account to share this video.</p>}<Link href="/settings" target="_blank" rel="noopener noreferrer">Manage Instagram connection ↗</Link><p>Settings opens in a new tab, keeping your post caption here.</p>
      {!info&&<p role="status">Checking account and video…</p>}
      {publication&&<div className="publication-result" role="status"><h2>{states[publication.state]??publication.state}</h2><p>Destination: @{publication.username}</p>{publication.safeError&&<p>{publication.safeError}</p>}{publication.warning&&<p>Instagram published the Reel but reported a content issue. Review it on Instagram.</p>}{publication.permalink?<a href={publication.permalink} target="_blank" rel="noopener noreferrer">View Reel on Instagram ↗</a>:publication.state==='published'?<p>Meta confirmed publication. The post link is not available; check your Instagram profile.</p>:null}{['outcome_unknown','needs_attention'].includes(publication.state)&&<button disabled={busy} onClick={check}>Check status again</button>}<p>You can leave this page and return to check the result.</p></div>}
      {!blocked&&<><label htmlFor="post-description">Post caption</label><textarea id="post-description" rows={6} value={caption} disabled={busy||uncertain} onChange={e=>{setCaption(e.target.value);setConfirmed(false)}} aria-describedby="post-count" placeholder="Add a little context for your audience…"/><p id="post-count" role={count>2200?'alert':undefined}>{count.toLocaleString()} / 2,200 characters{count>2200?' — Shorten your caption to publish.':''}</p><p>This text accompanies your Reel. It does not change the captions in the video.</p>
      {info?.reason&&<p role="status">{reasons[info.reason]??'This video is not eligible for publishing.'}</p>}
      <label className="publish-consent"><input type="checkbox" checked={confirmed} disabled={busy||uncertain||!info?.eligible} onChange={e=>setConfirmed(e.target.checked)}/>I confirm this version and caption will be posted to @{info?.connection?.username??'my connected account'}.</label>
      <button className="action" disabled={busy||(!uncertain&&(!info?.eligible||!confirmed||count>2200))} onClick={publish}>{busy?'Submitting…':uncertain?'Retry same request safely':'Post to Instagram'}</button><p>The Instagram copy remains after your local video expires.</p></>}
      <p role="alert">{error}</p>
      {publication&&<section><h2>Publishing history</h2><ul>{history.map(item=><li key={item.id}>@{item.username} · {states[item.state]??item.state}{item.permalink&&<> · <a href={item.permalink} target="_blank" rel="noopener noreferrer">View Reel</a></>}</li>)}</ul>{cursor!==null&&<button disabled={busy} onClick={more}>{history.length?'Load more attempts':'Show attempts'}</button>}</section>}
    </section></div></>;
}
