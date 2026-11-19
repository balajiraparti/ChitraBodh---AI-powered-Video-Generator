import React,{useRef,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/router';

export default function CaptionVariants({job}){
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const key=useRef(null);
  async function create(){
    if(busy)return;
    key.current ??= crypto.randomUUID();
    setBusy(true);setError('');
    try{
      const response=await fetch('/api/v1/projects/'+job.projectId+'/caption-variants',{
        method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':key.current},
        body:JSON.stringify({sourceVersionId:job.versionId,expectedRevision:job.projectRevision,captions:!job.captions})});
      const result=await response.json();
      if(response.ok){await router.push('/jobs/'+result.jobId);return;}
      setError(result.error?.code==='RENDER_SOURCE_UNAVAILABLE'
        ? 'This video was created before caption switching was available. Create a new video from its saved idea.'
        : result.error?.code==='ACTIVE_JOB_EXISTS'?'Finish your current video before changing captions.'
        : response.status===410?'This video has expired.':response.status===409?'Reload to see the latest video settings.':'Could not create the caption version. Try again.');
    }catch{setError('Could not confirm the caption request. Try again.');}
    finally{setBusy(false);}
  }
  return <section><h2>Captions</h2>
    {job.mediaAvailable && <><p>Captions are {job.captions?'on':'off'} in this download.</p>
      <button className="action" disabled={busy} onClick={create}>{busy?'Submitting…':job.captions?'Create video without captions':'Create video with captions'}</button>
      <p>The narration, animation and download deadline are shared.</p></>}
    <p role="status">{error}</p>
    {error && <Link href={'/create?fromJob='+job.sourceJobId}>Create a new video from this idea</Link>}
    {!!job.captionVariants?.length && <ul>{job.captionVariants.map(v=><li key={v.jobId}><Link href={'/jobs/'+v.jobId}>Captions {v.captions?'on':'off'} · {v.state}</Link></li>)}</ul>}
  </section>;
}
