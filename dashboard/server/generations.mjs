import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {preferences} from './preferences.mjs';
import {validTopic} from './drafts.mjs';
import {defaultVoice,narratorChoices} from './narrators.mjs';

const settings={voiceCatalogId:z.string().optional(),captions:z.boolean().optional()};
const input=z.union([
  z.object({topic:z.string().refine(validTopic).transform(v=>v.trim()),...settings}).strict(),
  z.object({projectId:z.string().min(1).max(128),expectedRevision:z.number().int().positive(),...settings}).strict()
]);

export function receipt(job) {
  return {projectId:job.projectId,versionId:job.versionId,jobId:job._id,state:job.state,stage:job.stage ?? 'queued',cancelRequested:job.cancelRequested ?? false,safeError:job.safeError ?? null,mediaUrl:job.artifactId ? "/api/v1/media/"+job.artifactId : null,statusUrl:'/api/v1/jobs/'+job._id};
}

export async function submitGeneration(store,ownerId,key,body) {
  const parsed=input.safeParse(body);
  if(!parsed.success || !z.uuid().safeParse(key).success)return {status:400,error:'INVALID_REQUEST'};
  const args=parsed.data;
  const signature=JSON.stringify(args);
  const replay=job=>job.signature===signature ? {status:202,data:receipt(job)} : {status:409,error:'KEY_REUSED'};
  const {jobs,projects,versions,client}=store;
  async function known(session) {
    const prior=await jobs.findOne({ownerId,key},{session});
    if(prior)return replay(prior);
    const active=await jobs.findOne({ownerId,active:true},{session});
    if(active)return {status:409,error:'ACTIVE_JOB_EXISTS',data:receipt(active)};
  }
  try {
    return await client.withSession(session=>session.withTransaction(async()=>{
      const existing=await known(session);
      if(existing)return existing;
      const projectId=args.projectId ?? randomUUID();
      let draft;
      if(args.projectId){
        draft=await projects.findOne({_id:projectId,ownerId},{session});
        if(!draft)return {status:404,error:'PROJECT_NOT_FOUND'};
        if(draft.status!=='draft'||draft.revision!==args.expectedRevision)return {status:409,error:'DRAFT_CHANGED'};
      }
      const topic=draft?.topic ?? args.topic;
      const saved=!draft && store.preferences && (args.voiceCatalogId===undefined || args.captions===undefined) ? await preferences(store.preferences,ownerId) : null;
      const voiceCatalogId=args.voiceCatalogId ?? draft?.voiceCatalogId ?? saved?.voiceCatalogId ?? defaultVoice;
      if(!narratorChoices().some(v=>v.id===voiceCatalogId && v.available))return {status:422,error:'VOICE_UNAVAILABLE'};
      const captions=args.captions ?? draft?.captions ?? saved?.captions ?? true;
      const now=new Date();
      const job={_id:randomUUID(),ownerId,key,signature,projectId,versionId:randomUUID(),active:true,state:'queued',createdAt:now};
      await jobs.insertOne(job,{session});
      const fields={topic,voiceCatalogId,captions,status:'generating',activeJobId:job._id,updatedAt:now};
      if(draft)await projects.updateOne({_id:projectId,ownerId,revision:draft.revision},{$set:fields,$inc:{revision:1}},{session});
      else await projects.insertOne({_id:projectId,ownerId,...fields,revision:1,createdAt:now},{session});
      await versions.insertOne({_id:job.versionId,projectId,ownerId,number:1,topic,settingsSnapshot:{voiceCatalogId,captions},state:'pending',createdAt:now},{session});
      return {status:202,data:receipt(job)};
    },{writeConcern:{w:'majority'}}));
  }catch(error){
    if(error.code!==11000)throw error;
    const winner=await known();
    if(winner)return winner;
    throw error;
  }
}
