import {receipt} from './generations.mjs';
import {canReadMedia} from './media.mjs';

export async function jobStatus(store,job,now=new Date()){
  const result=receipt(job);
  result.isCaptionVariant=job.kind==='caption';
  if(store.versions && (['revision','caption'].includes(job.kind)||job.state==='succeeded')){
    const filter={ownerId:job.ownerId,projectId:job.projectId};
    const [versions,jobs,project]=await Promise.all([
      store.versions.find(filter,{projection:{number:1}}).sort({number:-1}).toArray(),
      store.jobs.find(filter,{projection:{versionId:1,state:1,kind:1,captions:1}}).toArray(),
      store.projects.findOne({_id:job.projectId,ownerId:job.ownerId},{projection:{revision:1}})
    ]);
    const byVersion=new Map(jobs.filter(j=>j.kind!=='caption').map(item=>[item.versionId,item]));
    result.versions=versions.filter(v=>byVersion.has(v._id)).map(v=>({id:byVersion.get(v._id)._id,number:v.number,state:byVersion.get(v._id).state}));
    result.projectRevision=project?.revision??null;
    result.isRevision=['revision','caption'].includes(job.kind);
    result.captionVariants=jobs.filter(j=>j.kind==='caption'&&j.versionId===job.versionId).map(j=>({jobId:j._id,state:j.state,captions:j.captions}));
    const version=await store.versions.findOne({_id:job.versionId,ownerId:job.ownerId});
    result.captions=job.kind==='caption'?job.captions:version?.settingsSnapshot?.captions;
    result.sourceJobId=byVersion.get(job.versionId)?._id ?? job._id;
  }
  if(job.state!=='succeeded')return result;
  const artifact=job.artifactId && await store.artifacts.findOne({_id:job.artifactId,ownerId:job.ownerId});
  const available=canReadMedia(artifact,job.ownerId,now);
  return {...result,mediaAvailable:available,mediaUrl:available?result.mediaUrl:null,
    expiresAt:available?new Date(artifact.expiresAt).toISOString():null};
}
