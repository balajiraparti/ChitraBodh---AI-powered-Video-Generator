import {expiryFor} from './media.mjs';
import {randomUUID} from 'node:crypto';
import {hostname} from 'node:os';

export async function ownSlot(store){
  const token=randomUUID();
  await store.workerSlots.insertOne({_id:'generation',token,host:hostname(),pid:process.pid,heartbeatAt:new Date()});
  return token;
}
export async function finishJob(store,job,state,fields={},artifact){
  return store.client.withSession(session=>session.withTransaction(async()=>{
    const current=await store.jobs.findOne({_id:job._id,active:true},{session});
    if(!current)return false;
    const outcome=current.cancelRequested?'cancelled':state;
    if(outcome==='succeeded' && artifact){
      const project=await store.projects.findOne({_id:job.projectId,ownerId:job.ownerId},{session});
      const times=expiryFor(project.firstReadyAt);
      if(+times.expiresAt<=Date.now())throw Error('Media availability window ended');
      await store.artifacts.updateOne({_id:artifact._id,state:'uploading'},{$set:{state:'ready',...times}},{session});
      await store.projects.updateOne({_id:job.projectId},{$set:{firstReadyAt:times.readyAt,expiresAt:times.expiresAt,artifactId:artifact._id}},{session});
      await store.versions.updateOne({_id:job.versionId},{$set:{artifactId:artifact._id,...times}},{session});
      fields={...fields,artifactId:artifact._id};
    }
    if(outcome==='cancelled')fields={...fields,safeError:null};
    await store.jobs.updateOne({_id:job._id,active:true},{$set:{state:outcome,active:false,finishedAt:new Date(),...fields}},{session});
    await store.versions.updateOne({_id:job.versionId},{$set:{state:outcome==='succeeded'?'ready':outcome}},{session});
    await store.projects.updateOne({_id:job.projectId,activeJobId:job._id},{$set:{status:outcome==='succeeded'?'ready':'draft',updatedAt:new Date()},$unset:{activeJobId:''}},{session});
    return outcome;
  }));
}
export async function claimJob(store,token){
  return store.client.withSession(session=>session.withTransaction(async()=>{
    const slot=await store.workerSlots.findOne({_id:'generation',token},{session});
    if(!slot)throw Error('Worker slot lost');
    const job=await store.jobs.findOneAndUpdate({state:'queued',active:true},
      {$set:{state:'running',stage:'planning',workerToken:token,startedAt:new Date()}},
      {sort:{createdAt:1,_id:1},returnDocument:'after',session});
    if(job)await store.workerSlots.updateOne({_id:'generation',token},{$set:{jobId:job._id}},{session});
    return job;
  }));
}
export async function cancelJob(store,ownerId,id){
  return store.client.withSession(session=>session.withTransaction(async()=>{
    const job=await store.jobs.findOne({_id:id,ownerId},{session});
    if(!job)return null;
    if(!job.active)return job;
    if(job.state==='queued'){
      const stopped={state:'cancelled',active:false,cancelRequested:true,finishedAt:new Date()};
      await store.jobs.updateOne({_id:id,ownerId,active:true},{$set:stopped},{session});
      await store.versions.updateOne({_id:job.versionId},{$set:{state:'cancelled'}},{session});
      await store.projects.updateOne({_id:job.projectId,activeJobId:id},{$set:{status:'draft'},$unset:{activeJobId:''}},{session});
      return {...job,...stopped};
    }
    await store.jobs.updateOne({_id:id,ownerId,active:true},{$set:{cancelRequested:true}},{session});
    return {...job,cancelRequested:true};
  }));
}
export const pipelineStages={'Planning scenes':'planning','Generating narration':'narration','Rendering video':'animating','Checking export':'finishing'};
