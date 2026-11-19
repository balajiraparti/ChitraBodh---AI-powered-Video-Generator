import {createHash,randomUUID} from 'node:crypto';
import {z} from 'zod';
import {receipt} from './generations.mjs';
import {canReadMedia} from './media.mjs';

const request=z.object({sourceVersionId:z.string().min(1).max(128),captions:z.boolean(),expectedRevision:z.number().int().positive()}).strict();
export async function submitCaptionVariant(store,ownerId,projectId,key,body) {
  const parsed=request.safeParse(body);
  if(!parsed.success||!z.uuid().safeParse(key).success)return {status:400,error:'INVALID_REQUEST'};
  const args=parsed.data;
  const signature=createHash('sha256').update(JSON.stringify(['caption',projectId,args])).digest('hex');
  async function existing(session){
    const prior=await store.jobs.findOne({ownerId,key},{session});
    if(prior)return prior.signature===signature?{status:202,data:receipt(prior)}:{status:409,error:'KEY_REUSED'};

  }
  try {
    return await store.client.withSession(session=>session.withTransaction(async()=>{
      const replay=await existing(session);if(replay)return replay;
      const project=await store.projects.findOne({_id:projectId,ownerId},{session});
      const source=await store.versions.findOne({_id:args.sourceVersionId,projectId,ownerId,state:'ready'},{session});
      if(!project||!source)return {status:404,error:'SOURCE_NOT_FOUND'};
      const artifact=await store.artifacts.findOne({_id:source.artifactId,ownerId},{session});
      if(!canReadMedia(artifact,ownerId)||!(project.expiresAt>new Date()))return {status:410,error:'SOURCE_EXPIRED'};
      const matching=await store.jobs.findOne({ownerId,projectId,versionId:source._id,kind:'caption',captions:args.captions,state:'succeeded'},{session});
      const match=matching&&await store.artifacts.findOne({_id:matching.artifactId,ownerId},{session});
      if(canReadMedia(match,ownerId))return {status:202,data:receipt(matching)};
      if(args.captions===source.settingsSnapshot.captions){
        const original=await store.jobs.findOne({ownerId,versionId:source._id,state:'succeeded',kind:{$ne:'caption'}},{session});
        if(original)return {status:202,data:receipt(original)};
      }
      if(await store.jobs.findOne({ownerId,active:true},{session}))return {status:409,error:'ACTIVE_JOB_EXISTS'};
      if(project.revision!==args.expectedRevision)return {status:409,error:'PROJECT_CHANGED'};
      if(!artifact.renderKey)return {status:409,error:'RENDER_SOURCE_UNAVAILABLE'};
      const now=new Date();
      const job={_id:randomUUID(),kind:'caption',ownerId,projectId,versionId:source._id,sourceArtifactId:artifact._id,captions:args.captions,key,signature,active:true,state:'queued',createdAt:now};
      await store.jobs.insertOne(job,{session});
      await store.projects.updateOne({_id:projectId,ownerId},{$set:{activeJobId:job._id,updatedAt:now},$inc:{revision:1}},{session});
      return {status:202,data:receipt(job)};
    }));
  }catch(error){if(error.code!==11000)throw error;const prior=await existing();if(prior)return prior;if(await store.jobs.findOne({ownerId,active:true}))return {status:409,error:'ACTIVE_JOB_EXISTS'};throw error;}
}
