import {receipt} from './generations.mjs';
import {canReadMedia} from './media.mjs';

export async function jobStatus(store,job,now=new Date()){
  const result=receipt(job);
  if(job.state!=='succeeded')return result;
  const artifact=job.artifactId && await store.artifacts.findOne({_id:job.artifactId,ownerId:job.ownerId});
  const available=canReadMedia(artifact,job.ownerId,now);
  return {...result,mediaAvailable:available,mediaUrl:available?result.mediaUrl:null,
    expiresAt:available?new Date(artifact.expiresAt).toISOString():null};
}
