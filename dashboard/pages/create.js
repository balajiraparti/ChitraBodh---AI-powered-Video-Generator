import {useRef,useState} from 'react';
import Link from 'next/link';
import {currentOwner,services} from '../server/auth.mjs';
import {readDraft} from '../server/drafts.mjs';

export async function getServerSideProps({req,res,query}) {
  res.setHeader('Cache-Control','private, no-store');
  const owner=await currentOwner(req);
  if(!owner)return {redirect:{destination:'/sign-in',permanent:false}};
  if(query.draft!==undefined && typeof query.draft!=='string')return {notFound:true};
  const {projects}=await services();
  const initial=await readDraft(projects,owner,query.draft);
  if(query.draft!==undefined && !initial)return {notFound:true};
  return {props:{initial}};
}
export default function Create({initial}) {
  return <Editor key={initial?.id ?? 'new'} initial={initial}/>;
}
function Editor({initial}) {
  const [draft,setDraft]=useState(initial);
  const [topic,setTopic]=useState(initial?.topic || '');
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  const request=useRef(null);
  const length=[...topic].length;
  async function save(event) {
    event.preventDefault();
    if(busy||!topic.trim()||length>2000)return;
    setBusy(true);
    setMessage('');
    try{
      if(!request.current || request.current.topic!==topic)request.current={topic,key:crypto.randomUUID()};
      const response=await fetch('/api/projects'+(draft?'/'+draft.id:''),{
        method:draft?'PATCH':'POST',
        headers:{'Content-Type':'application/json','Idempotency-Key':request.current.key},
        body:JSON.stringify({topic,expectedRevision:draft?.revision})
      });
      if(response.status===409){setMessage('This draft changed. Copy your edits before reloading the saved version.');return;}
      if(response.status===401){setMessage('Your session expired. Sign in in another tab, then save again.');return;}
      if(!response.ok)throw Error();
      const data=await response.json();
      setDraft(data);setTopic(data.topic);setMessage('Draft saved.');
    }catch{setMessage('Could not confirm the save. Your text is still here. Try again.');}
    finally{setBusy(false);}
  }
  return <><h1>Create a video</h1><section><form onSubmit={save} className="draft-form">
    <label htmlFor="topic">What would you like to explain?</label>
    <textarea id="topic" rows={6} value={topic} disabled={busy} onChange={e=>{setTopic(e.target.value);setMessage('')}} aria-describedby="topic-count" aria-invalid={length>2000}/>
    <small id="topic-count">{length} / 2,000 characters{length>2000?' · Shorten your idea before saving.':''}</small>
    <button className="action" disabled={busy || !topic.trim() || length>2000}>{busy?'Saving…':'Save draft'}</button>
    <span role="status">{message}</span>
    {draft && <Link href={'/create?draft='+draft.id}>Open saved draft</Link>}
  </form></section></>;
}
