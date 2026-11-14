import {createHash,randomUUID} from 'node:crypto';
import {z} from 'zod';
import {receipt} from './generations.mjs';
import {canReadMedia} from './media.mjs';
import {narratorChoices} from './narrators.mjs';

const request=z.object({
  sourceVersionId:z.string().min(1).max(128),
  instruction:z.string().trim().min(1).refine(text=>[...text].length<=1000),
  expectedRevision:z.number().int().positive(),
  voiceCatalogId:z.string().optional(),captions:z.boolean().optional()
}).strict();
function sourcePlanFilter(ownerId, versionId) {
  return {_id:versionId, ownerId, expiresAt:{$gt:new Date()}, 'plan.scenes.0':{$exists:true}};
}

export async function loadRevisionContext(store, job) {
  const original = await store.revisionPlans.findOne(sourcePlanFilter(job.ownerId, job.sourceVersionId));
  if (!original) throw Object.assign(new Error('Source storyboard unavailable'), {code:'SOURCE_STORYBOARD_UNAVAILABLE'});
  const input = await store.revisionInputs.findOne({_id:job.versionId, ownerId:job.ownerId, expiresAt:{$gt:new Date()}});
  if (!input) throw new Error('Revision expired');
  return JSON.stringify({requestedChanges:input.instruction, sourceStoryboard:original.plan});
}

export async function submitRevision(store,ownerId,projectId,key,body){
  const parsed=request.safeParse(body);
  if(!parsed.success || !z.uuid().safeParse(key).success)return {status:400,error:'INVALID_REQUEST'};
  const args=parsed.data;
  const signature=createHash('sha256').update(JSON.stringify([projectId,args])).digest('hex');
  const accepted=job=>({status:202,data:receipt(job)});
  async function existing(session){
    const prior=await store.jobs.findOne({ownerId,key},{session});
    if(prior)return prior.signature===signature?accepted(prior):{status:409,error:'KEY_REUSED'};
    if(await store.jobs.findOne({ownerId,active:true},{session}))return {status:409,error:'ACTIVE_JOB_EXISTS'};
  }
  try{
    return await store.client.withSession(session=>session.withTransaction(async()=>{
      const previous=await existing(session);
      if(previous)return previous;
      const project=await store.projects.findOne({_id:projectId,ownerId},{session});
      const source=await store.versions.findOne({_id:args.sourceVersionId,projectId,ownerId,state:'ready'},{session});
      if(!project||!source)return {status:404,error:'SOURCE_NOT_FOUND'};
      const media=await store.artifacts.findOne({_id:source.artifactId,ownerId},{session});
      if(!canReadMedia(media,ownerId)||!(project.expiresAt>new Date()))return {status:410,error:'SOURCE_EXPIRED'};
      if(project.status!=='ready'||project.revision!==args.expectedRevision)return {status:409,error:'PROJECT_CHANGED'};
      const storyboard = await store.revisionPlans.findOne(sourcePlanFilter(ownerId, source._id), {session, projection:{_id:1}});
      if (!storyboard) return {status:409,error:'SOURCE_STORYBOARD_UNAVAILABLE'};
      const voiceCatalogId=args.voiceCatalogId??source.settingsSnapshot.voiceCatalogId;
      if(!narratorChoices().some(v=>v.id===voiceCatalogId && v.available))return {status:422,error:'VOICE_UNAVAILABLE'};
      const now=new Date(),versionId=randomUUID();
      const job={_id:randomUUID(),kind:'revision',ownerId,projectId,versionId,key,signature,sourceVersionId:source._id,active:true,state:'queued',createdAt:now};
      const latest=await store.versions.findOne({projectId,ownerId},{session,sort:{number:-1}});
      await store.jobs.insertOne(job,{session});
      await store.versions.insertOne({_id:versionId,ownerId,projectId,sourceVersionId:source._id,number:latest.number+1,topic:source.topic,settingsSnapshot:{voiceCatalogId,captions:args.captions??source.settingsSnapshot.captions},state:'pending',createdAt:now},{session});
      await store.revisionInputs.insertOne({_id:versionId,ownerId,instruction:args.instruction,expiresAt:project.expiresAt},{session});
      await store.projects.updateOne({_id:projectId,ownerId},{$set:{activeJobId:job._id,updatedAt:now},$inc:{revision:1}},{session});
      return accepted(job);
    }));
  }catch(error){
    if(error.code!==11000)throw error;
    const prior=await existing();
    if(prior)return prior;
    throw error;
  }
}
