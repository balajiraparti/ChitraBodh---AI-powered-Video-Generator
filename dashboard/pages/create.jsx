import {useRouter} from 'next/router';
import React,{useRef,useState} from 'react';
import Link from 'next/link';
import NarratorCards from '../components/NarratorCards';
import StitchComposition from '../components/StitchComposition';
import IdeaAssistant from '../components/IdeaAssistant';
import {currentOwner,services} from '../server/auth.mjs';
import {createPage} from '../server/create-page.mjs';

export async function getServerSideProps({req,res,query}) {
  res.setHeader('Cache-Control','private, no-store');
  const owner=await currentOwner(req);
  if(!owner)return {redirect:{destination:'/sign-in',permanent:false}};
  return createPage(await services(),owner,query);
}
export default function Create({initial,seed,voices,activeJobId}) {
  return <Editor key={initial?.id ?? seed?.sourceJobId ?? 'new'} initial={initial} seed={seed} voices={voices} activeJobId={activeJobId}/>;
}
function Editor({initial,seed,voices,activeJobId}) {
  const router=useRouter();
  const [ideasOpen,setIdeasOpen]=useState(false);
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
    if(activeJobId || busy || dirty || !available || !topic.trim() || length>2000)return;
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
  return <><Link className="back-link" href="/dashboard">← Back to My videos</Link><h1>Create a video</h1><p>Enter a topic to generate a vertical video with synchronized diagrams.</p><div className="composer-grid"><section><form onSubmit={save} className="draft-form">
    <div className="topic-tools"><label htmlFor="topic">What would you like to explain?</label><button type="button" aria-expanded={ideasOpen} aria-controls="idea-panel" onClick={()=>setIdeasOpen(!ideasOpen)}>Help me find an idea</button></div>
    <textarea id="topic" rows={6} value={topic} disabled={busy} onChange={e=>{setTopic(e.target.value);setMessage('')}} aria-describedby="topic-count" aria-invalid={length>2000}/>
    <small id="topic-count">{length} / 2,000 characters{length>2000?' · Shorten your idea before saving.':''}</small>
    <h2 className="form-subtitle">Narration &amp; Output</h2>
    <NarratorCards voices={voices} value={voiceCatalogId} disabled={busy} onChange={v=>{setVoice(v);setMessage('');}}/>
    {!available && <p>Select an available narrator to save this draft.</p>}
    <label><input type="checkbox" checked={captions} disabled={busy} onChange={event=>{setCaptions(event.target.checked);setMessage("");}}/> Include synchronized captions</label>

    {dirty && <small>Save your changes before creating the video.</small>}
    {activeJobId && <p>You can edit this draft while your <Link href={"/jobs/"+activeJobId}>current video</Link> is generating. Reopen this draft after it finishes to create another video.</p>}
    <div className="composer-actions">
    <button type="button" className="action" disabled={activeJobId || busy || dirty || !available || !topic.trim() || length>2000} onClick={generate}>{pending==='generation'?'Submitting…':'Create video'}</button>
    <button className="action" disabled={busy || !available || !topic.trim() || length>2000}>{pending==='save'?'Saving…':'Save draft'}</button>
    </div>
    <span role="status">{message}</span>
    {draft && <Link href={'/create?draft='+draft.id}>Open saved draft</Link>}
  </form></section><div className="composer-side"><div hidden={!ideasOpen}><IdeaAssistant open={ideasOpen} setOpen={setIdeasOpen} draftId={draft?.id} topic={topic} disabled={busy} onChoose={idea=>{setTopic(idea);setMessage("Idea selected. You can edit it before creating a video.");}}/></div>{!ideasOpen && <StitchComposition/>}</div></div></>;
}
