import {expiryFor} from './media.mjs';
import {randomUUID} from 'node:crypto';
import {hostname} from 'node:os';

export const workerLeaseMs = 30000;
const lostLease = () => Object.assign(Error('Worker lease lost'), {code:'WORKER_LEASE_LOST'});
const liveSlot = token => ({_id:'generation',token,leaseUntil:{$gt:new Date()}});

export async function renewSlot(store, token, fields = {}) {
  const now = new Date();
  const result = await store.workerSlots.updateOne(liveSlot(token),
    {$set:{...fields,heartbeatAt:now,leaseUntil:new Date(+now + workerLeaseMs)}});
  if (!result.matchedCount) throw lostLease();
}
async function fence(store, token, session) {
  const result = await store.workerSlots.updateOne(liveSlot(token),
    {$inc:{writes:1}}, {session});
  if (!result.matchedCount) throw lostLease();
}
export async function ownSlot(store) {
  const token = randomUUID();
  try {
    return await store.client.withSession(session => session.withTransaction(async () => {
      const now = new Date();
      const old = await store.workerSlots.findOne({_id:'generation'}, {session});
      // Old installations used heartbeatAt without an explicit deadline.
      const deadline = old?.leaseUntil ?? new Date(+(old?.heartbeatAt ?? old?.createdAt ?? 0) + workerLeaseMs);
      if (old && deadline > now) throw Object.assign(Error('Worker lease occupied'), {code:'WORKER_BUSY'});
      const slot = {token,host:hostname(),pid:process.pid,heartbeatAt:now,leaseUntil:new Date(+now + workerLeaseMs)};
      if (old) await store.workerSlots.updateOne({_id:'generation',token:old.token},
        {$set:slot,$unset:{jobId:'',childPid:''}}, {session});
      else await store.workerSlots.insertOne({_id:'generation',...slot}, {session});
      if (old) {
        for await (const job of store.jobs.find({active:true,workerToken:old.token}, {session})) {
          await completeJob(store, job, 'failed',
            {safeError:'Creation was interrupted. Your idea is saved.'}, undefined, undefined, session);
        }
      }
      return token;
    }));
  } catch (error) {
    if (error.code === 11000) throw Object.assign(Error('Worker lease occupied'), {code:'WORKER_BUSY'});
    throw error;
  }
}
export async function updateJobProgress(store, job, fields) {
  return store.client.withSession(session => session.withTransaction(async () => {
    await fence(store, job.workerToken, session);
    const result = await store.jobs.updateOne({_id:job._id,active:true,workerToken:job.workerToken},
      {$set:fields}, {session});
    if (!result.matchedCount) throw lostLease();
  }));
}
export async function finishJob(store,job,state,fields={},artifact,plan){
  return store.client.withSession(session=>session.withTransaction(async()=>{
    const current=await store.jobs.findOne({_id:job._id,active:true},{session});
    if(!current)return false;
    if (current.workerToken) {
      if (job.workerToken !== current.workerToken) throw lostLease();
      await fence(store, job.workerToken, session);
    }
    return completeJob(store, current, state, fields, artifact, plan, session);
  }));
}
async function completeJob(store, current, state, fields, artifact, plan, session) {
    const job = current;
    const outcome=current.cancelRequested?'cancelled':state;
    if(outcome==='succeeded' && artifact){
      const project=await store.projects.findOne({_id:job.projectId,ownerId:job.ownerId},{session});
      const times=expiryFor(project.firstReadyAt);
      if(+times.expiresAt<=Date.now())throw Error('Media availability window ended');
      if(plan)await store.revisionPlans.insertOne({_id:job.versionId,ownerId:job.ownerId,plan,expiresAt:times.expiresAt},{session});
      await store.artifacts.updateOne({_id:artifact._id,state:'uploading'},{$set:{state:'ready',...times}},{session});
      await store.projects.updateOne({_id:job.projectId},{$set:{firstReadyAt:times.readyAt,expiresAt:times.expiresAt,artifactId:artifact._id}},{session});
      await store.versions.updateOne({_id:job.versionId},{$set:{artifactId:artifact._id,...times}},{session});
      fields={...fields,artifactId:artifact._id};
    }
    if(outcome==='cancelled')fields={...fields,safeError:null};
    await store.jobs.updateOne({_id:job._id,active:true},{$set:{state:outcome,active:false,finishedAt:new Date(),...fields}},{session});
    await store.versions.updateOne({_id:job.versionId},{$set:{state:outcome==='succeeded'?'ready':outcome}},{session});
    await store.projects.updateOne({_id:job.projectId,activeJobId:job._id},{$set:{status:outcome==='succeeded'||job.kind==='revision'?'ready':'draft',updatedAt:new Date()},$unset:{activeJobId:''}},{session});
    if(job.kind==='revision')await store.revisionInputs.deleteOne({_id:job.versionId},{session});
    return outcome;
}
export async function claimJob(store,token){
  return store.client.withSession(session=>session.withTransaction(async()=>{
    await fence(store, token, session);
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
      await store.projects.updateOne({_id:job.projectId,activeJobId:id},{$set:{status:job.kind==='revision'?'ready':'draft'},$unset:{activeJobId:''}},{session});
      if(job.kind==='revision')await store.revisionInputs.deleteOne({_id:job.versionId},{session});
      return {...job,...stopped};
    }
    await store.jobs.updateOne({_id:id,ownerId,active:true},{$set:{cancelRequested:true}},{session});
    return {...job,cancelRequested:true};
  }));
}
export const pipelineStages={'Planning scenes':'planning','Generating narration':'narration','Rendering video':'animating','Checking export':'finishing'};
