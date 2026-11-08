import {useRouter} from 'next/router';
import React,{useRef,useState} from 'react';
import Link from 'next/link';
import {currentOwner,services} from '../server/auth.mjs';
import {narratorChoices} from '../server/narrators.mjs';
import {readDraft} from '../server/drafts.mjs';

export async function getServerSideProps({req,res,query}) {
  res.setHeader('Cache-Control','private, no-store');
  const owner=await currentOwner(req);
  if(!owner)return {redirect:{destination:'/sign-in',permanent:false}};
  if(query.draft!==undefined && typeof query.draft!=='string')return {notFound:true};
  const {projects,jobs,versions}=await services();
  const activeJob=await jobs.findOne({ownerId:owner,active:true},{projection:{_id:1}});
  if(activeJob)return {redirect:{destination:'/jobs/'+activeJob._id,permanent:false}};
  if(query.fromJob!==undefined){
    if(typeof query.fromJob!=='string')return {notFound:true};
    const source=await jobs.findOne({_id:query.fromJob,ownerId:owner,state:'succeeded'});
    const version=source && await versions.findOne({_id:source.versionId,ownerId:owner});
    if(!version)return {notFound:true};
    const seed={topic:version.topic,voiceCatalogId:version.settingsSnapshot.voiceCatalogId,captions:version.settingsSnapshot.captions};
    return {props:{initial:null,seed,voices:narratorChoices()}};
  }
  const initial=await readDraft(projects,owner,query.draft);
  if(query.draft!==undefined && !initial)return {notFound:true};
  return {props:{initial,voices:narratorChoices()}};
}
export default function Create({initial,seed,voices}) {
  return <Editor key={initial?.id ?? seed?.topic ?? 'new'} initial={initial} seed={seed} voices={voices}/>;
}
function Editor({initial,seed,voices}) {
  const router=useRouter();
  const [draft,setDraft]=useState(initial);
  const [topic,setTopic]=useState(initial?.topic ?? seed?.topic ?? '');
  const [voiceCatalogId,setVoice]=useState(initial?.voiceCatalogId ?? seed?.voiceCatalogId ?? voices[0].id);
  const [captions,setCaptions]=useState(initial?.captions ?? seed?.captions ?? true);
  const available=voices.some(voice=>voice.id===voiceCatalogId && voice.available);
  const [message,setMessage]=useState('');
  const [pending,setPending]=useState(null);
  const busy=pending!==null;
  const request=useRef(null);
  const generation=useRef(null);
  const dirty=draft && (topic.trim()!==draft.topic || captions!==draft.captions || voiceCatalogId!==draft.voiceCatalogId);
  async function generate(){
    if(busy || dirty || !available || !topic.trim() || length>2000)return;
    setPending('generation');
    setMessage('');
    try{
      const body=JSON.stringify(draft?{projectId:draft.id,expectedRevision:draft.revision}:{topic,voiceCatalogId,captions});
      if(generation.current?.body!==body)generation.current={body,key:crypto.randomUUID()};
      const response=await fetch('/api/v1/generations',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':generation.current.key},body});
      const result=await response.json().catch(()=>({}));
      if(response.status===202 || result.error?.code==='ACTIVE_JOB_EXISTS'){await router.push('/jobs/'+(result.jobId || result.job.jobId));return;}
      if(response.status===409){setMessage('The draft changed. Reopen the saved version before generating.');return;}
      if(response.status===401){setMessage('Sign in again before creating a video.');return;}
      if(response.status===422){setMessage('Choose an available narrator before generating.');return;}
      throw Error();
    }catch{setMessage('Could not confirm your request. Try again.');}
    finally{setPending(null);}
  }
  const length=[...topic].length;
  async function save(event) {
    event.preventDefault();
    if(busy||!available||!topic.trim()||length>2000)return;
    setPending('save');
    setMessage('');
    try{
      const fingerprint=JSON.stringify([topic,voiceCatalogId,captions]);
      if(request.current?.fingerprint!==fingerprint)request.current={fingerprint,key:crypto.randomUUID()};
      const response=await fetch('/api/projects'+(draft?'/'+draft.id:''),{
        method:draft?'PATCH':'POST',
        headers:{'Content-Type':'application/json','Idempotency-Key':request.current.key},
        body:JSON.stringify({topic,voiceCatalogId,captions,expectedRevision:draft?.revision})
      });
      if(response.status===422){setMessage('This narrator is unavailable. Reload to see current choices.');return;}
      if(response.status===409){setMessage('This draft changed. Copy your edits before reloading the saved version.');return;}
      if(response.status===401){setMessage('Your session expired. Sign in in another tab, then save again.');return;}
      if(!response.ok)throw Error();
      const data=await response.json();
      setDraft(data);setTopic(data.topic);setMessage('Draft saved.');
    }catch{setMessage('Could not confirm the save. Your text is still here. Try again.');}
    finally{setPending(null);}
  }
  return <><Link className="back-link" href="/dashboard">← My videos</Link><h1>Create a video</h1><div className="composer-grid"><section><form onSubmit={save} className="draft-form">
    <label htmlFor="topic">What would you like to explain?</label>
    <textarea id="topic" rows={6} value={topic} disabled={busy} onChange={e=>{setTopic(e.target.value);setMessage('')}} aria-describedby="topic-count" aria-invalid={length>2000}/>
    <small id="topic-count">{length} / 2,000 characters{length>2000?' · Shorten your idea before saving.':''}</small>
    <h2 className="form-subtitle">Narration and captions</h2><label htmlFor="narrator">Narrator</label>
    <select id="narrator" value={voiceCatalogId} disabled={busy} onChange={event=>{setVoice(event.target.value);setMessage("");}}>
      {voices.map(voice=><option key={voice.id} value={voice.id} disabled={!voice.available}>{voice.name}{voice.available?"":" · Unavailable"}</option>)}
    </select>
    {!available && <p>Select an available narrator to save this draft.</p>}
    <label><input type="checkbox" checked={captions} disabled={busy} onChange={event=>{setCaptions(event.target.checked);setMessage("");}}/> Include synchronized captions</label>
    <button className="action" disabled={busy || !available || !topic.trim() || length>2000}>{pending==='save'?'Saving…':'Save draft'}</button>
    {dirty && <small>Save your changes before creating the video.</small>}
    <button type="button" className="action" disabled={busy || dirty || !available || !topic.trim() || length>2000} onClick={generate}>{pending==='generation'?'Submitting…':'Create video'}</button>
    <span role="status">{message}</span>
    {draft && <Link href={'/create?draft='+draft.id}>Open saved draft</Link>}
  </form></section><aside className="studio-note"><h2>Video format</h2><dl><dt>Frame</dt><dd>Vertical · 9:16</dd><dt>Length</dt><dd>Typically 60–90 seconds</dd><dt>Captions</dt><dd>{captions?"Included":"Off"}</dd></dl></aside></div></>;
}
