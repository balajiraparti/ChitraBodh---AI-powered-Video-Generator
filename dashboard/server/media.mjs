import {randomUUID} from 'node:crypto';
export const retentionMs=2*60*60*1000;
export function expiryFor(firstReadyAt,now=new Date()){
  const readyAt=firstReadyAt ? new Date(firstReadyAt) : now;
  return {readyAt,expiresAt:new Date(+readyAt+retentionMs)};
}
export function canReadMedia(artifact,ownerId,now=new Date()){
  return artifact?.ownerId===ownerId && artifact.state==='ready' && +new Date(artifact.expiresAt)>+now;
}
export async function uploadMedia(store,storage,job,file,signal){
  const id=randomUUID();
  const artifact={_id:id,jobId:job._id,ownerId:job.ownerId,projectId:job.projectId,versionId:job.versionId,
    objectKey:'chitrabodh/'+id+'/video.mp4',state:'uploading',expiresAt:new Date(Date.now()+20*60*1000)};
  await store.artifacts.insertOne(artifact);
  await storage.put(artifact.objectKey,file,signal);
  return artifact;
}
export async function cleanupMedia(store,storage,now=new Date()){
  const candidates=store.artifacts.find({state:{$ne:'deleted'},expiresAt:{$lte:now}});
  for await(const artifact of candidates){
    // An in-flight upload must stop before its object can be removed.
    if(await store.jobs.findOne({_id:artifact.jobId,active:true}))continue;
    try{
      await storage.remove(artifact.objectKey);
      await store.artifacts.updateOne({_id:artifact._id},{$set:{state:'deleted',deletedAt:now}});
    }catch{console.error('Media cleanup will retry an object');}
  }
}
