import React,{useRef,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/router';

export default function Versions({job}){
  const router=useRouter();
  const [instruction,setInstruction]=useState('');
  const [pending,setPending]=useState(false);
  const [error,setError]=useState('');
  const intent=useRef(null);
  async function revise(event){
    event.preventDefault();
    if(pending||!instruction.trim())return;
    setPending(true);setError('');
    const body=JSON.stringify({sourceVersionId:job.versionId,expectedRevision:job.projectRevision,instruction:instruction.trim()});
    if(intent.current?.body!==body)intent.current={body,key:crypto.randomUUID()};
    try{
      const response=await fetch('/api/v1/projects/'+job.projectId+'/revisions',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':intent.current.key},body});
      const result=await response.json();
      if(response.ok){await router.push("/jobs/"+encodeURIComponent(result.jobId));return;}
      setError(result.error?.code==='ACTIVE_JOB_EXISTS'?'Finish your current video before requesting a revision.':response.status===410?'This video has expired.':response.status===409?'Reload to see the latest versions.':'Could not request a revision. Try again.');
    }catch{setError('Could not confirm the revision. Try again.');}
    finally{setPending(false);}
  }
  return <section><h2>Versions</h2><ul>{job.versions.map(v=><li key={v.id}>{v.id===job.jobId?<strong>Version {v.number} · {v.state}</strong>:<Link href={'/jobs/'+v.id}>Version {v.number} · {v.state}</Link>}</li>)}</ul>
    {job.mediaAvailable && <form className="draft-form" onSubmit={revise}><label htmlFor="revision">What should change in this video?</label><textarea id="revision" rows={3} value={instruction} onChange={e=>setInstruction(e.target.value)} disabled={pending} placeholder="For example, explain evaporation using a puddle."/><small>All versions share the original download deadline.</small><button className="action" disabled={pending||!instruction.trim()||[...instruction.trim()].length>1000}>{pending?'Submitting…':'Create revised video'}</button><span role="status">{error}</span></form>}</section>;
}
