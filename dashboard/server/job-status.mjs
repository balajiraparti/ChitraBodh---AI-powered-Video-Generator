import {receipt} from './generations.mjs';
import {canReadMedia} from './media.mjs';

export async function jobStatus(store,job,now=new Date()){
  const result=receipt(job);
  if(store.versions && (job.kind==='revision'||job.state==='succeeded')){
    const filter={ownerId:job.ownerId,projectId:job.projectId};
    const [versions,jobs,project]=await Promise.all([
      store.versions.find(filter,{projection:{number:1}}).sort({number:-1}).toArray(),
      store.jobs.find(filter,{projection:{versionId:1,state:1}}).toArray(),
      store.projects.findOne({_id:job.projectId,ownerId:job.ownerId},{projection:{revision:1}})
    ]);
    const byVersion=new Map(jobs.map(item=>[item.versionId,item]));
    result.versions=versions.filter(v=>byVersion.has(v._id)).map(v=>({id:byVersion.get(v._id)._id,number:v.number,state:byVersion.get(v._id).state}));
    result.projectRevision=project?.revision??null;
    result.isRevision=job.kind==='revision';
  }
  if(job.state!=='succeeded')return result;
  const artifact=job.artifactId && await store.artifacts.findOne({_id:job.artifactId,ownerId:job.ownerId});
  const available=canReadMedia(artifact,job.ownerId,now);
  return {...result,mediaAvailable:available,mediaUrl:available?result.mediaUrl:null,
    expiresAt:available?new Date(artifact.expiresAt).toISOString():null};
}
