import {randomUUID,createHash} from 'node:crypto';
import {ObjectId} from 'mongodb';
import {z} from 'zod';
import {reserve} from './auth.mjs';
import {checkedStoryboard,storyboardHash,storyboardEstimate,scopeCandidate} from '../../src/storyboard.ts';
import {narratorChoices} from './narrators.mjs';
import {receipt} from './generations.mjs';

const TWO_HOURS=7200000;
const fail=(status,error)=>({status,error});
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const revision=z.number().int().positive();
const editSchema=z.object({expectedRevision:revision,scope:z.enum(['scene','storyboard']),sceneId:z.string().max(40).optional(),feedback:z.string().trim().min(1).refine(s=>[...s].length<=1000).optional(),narration:z.string().min(20).max(1300).optional()}).strict().refine(v=>(v.feedback!==undefined)!==(v.narration!==undefined)).refine(v=>v.scope==='scene'?!!v.sceneId:!v.sceneId&&!v.narration);
export const storyboardSchemas={start:z.object({expectedProjectRevision:revision}).strict(),edit:editSchema,apply:z.object({expectedRevision:revision,operationId:z.uuid()}).strict(),discard:z.object({expectedRevision:revision,operationId:z.uuid()}).strict(),cancel:z.object({operationId:z.uuid()}).strict(),generate:z.object({expectedRevision:revision,planHash:z.string().length(64),confirmed:z.literal(true)}).strict()};
export async function readStoryboard(store,ownerId,id){
 const head=await store.storyboardHeads.findOne({_id:id,ownerId});
 if(!head)return fail(404,'STORYBOARD_NOT_FOUND');
 if(head.expiresAt<=new Date())return fail(410,'STORYBOARD_EXPIRED');
 const project=await store.projects.findOne({_id:head.projectId,ownerId});
 if(!project)return fail(404,'PROJECT_NOT_FOUND');
 const operation=head.operationId?await store.storyboardOperations.findOne({_id:head.operationId,ownerId}):null;
 const active=await store.jobs.findOne({ownerId,active:true},{projection:{_id:1}});
 const candidate=operation?.state==='succeeded'&&operation.candidateState==='pending'?operation.plan:null;
 return {status:200,data:{id:head._id,projectId:head.projectId,revision:head.revision,planHash:head.planHash,plan:head.plan??null,settings:head.settings,topic:head.topic,expiresAt:head.expiresAt,serverNow:new Date(),stale:project.revision!==head.projectRevision,state:head.state,operation:operation?{id:operation._id,state:operation.state,error:operation.safeError??null}:null,candidate,candidateId:candidate?operation._id:null,activeJobId:active?._id??null}};
}
export async function storyboardCommand(store,ownerId,id,action,key,body){
 const parsed=storyboardSchemas[action]?.safeParse(body);
 if(!parsed?.success||!z.uuid().safeParse(key).success)return fail(400,'INVALID_REQUEST');
 const args=parsed.data,commandId=hash([ownerId,key]),signature=hash([id,action,args]);
 const prior=await store.storyboardReceipts.findOne({_id:commandId});
 if(prior)return prior.signature===signature?prior.result:fail(409,'KEY_REUSED');
 if(['start','edit'].includes(action)){
  const ids=ObjectId.isValid(ownerId)?[ownerId,new ObjectId(ownerId)]:[ownerId];
  if(!await store.db.collection('user').findOne({_id:{$in:ids},$or:[{emailVerified:true},{brainstormApproved:true}]}))return fail(403,'ACCOUNT_APPROVAL_REQUIRED');
  if(!await reserve(store.limits||store.db.collection('auth_limits'),'storyboard:'+ownerId,6,60000))return fail(429,'RATE_LIMITED');
 }
 try{return await store.client.withSession(session=>session.withTransaction(async()=>{
  const opts={session};
  const replay=await store.storyboardReceipts.findOne({_id:commandId},opts);
  if(replay)return replay.signature===signature?replay.result:fail(409,'KEY_REUSED');
  const project=await store.projects.findOne({_id:id,ownerId},opts);
  if(!project)return fail(404,'PROJECT_NOT_FOUND');
  const head=await store.storyboardHeads.findOne({_id:id,ownerId},opts),now=new Date();
  if(action!=='start'){
   if(!head)return fail(404,'STORYBOARD_NOT_FOUND');
   if(head.expiresAt<=now)return fail(410,'STORYBOARD_EXPIRED');
   if(args.expectedRevision!==undefined&&head.revision!==args.expectedRevision)return fail(409,'STORYBOARD_CHANGED');
  }
  let result;
  if(action==='start'||action==='edit'){
   if(project.status!=='draft')return fail(409,'DRAFT_CHANGED');
   if(action==='start'&&project.revision!==args.expectedProjectRevision)return fail(409,'DRAFT_CHANGED');
   if(action==='edit'&&(head.projectRevision!==project.revision||!head.plan))return fail(409,'DRAFT_CHANGED');
   if(head?.pendingCandidateId&&head.expiresAt>now)return fail(409,'RESOLVE_CHANGES_FIRST');
   if(await store.storyboardOperations.findOne({ownerId,active:true},opts))return fail(409,'STORYBOARD_BUSY');
   if(args.sceneId&&!head.plan.scenes.some(s=>s.id===args.sceneId))return fail(422,'SCENE_NOT_FOUND');
   const opId=randomUUID(),baseRevision=(head?.revision||0),expiresAt=action==='start'?(head?.plan&&head.expiresAt>now?head.expiresAt:new Date(+now+300000)):head.expiresAt;
   const op={_id:opId,ownerId,projectId:id,boardId:id,baseRevision,projectRevision:project.revision,action,args,boardExpiresAt:head?.plan&&head.expiresAt>now?head.expiresAt:null,sourcePlan:action==='edit'?head.plan:null,topic:project.topic,expiresAt:new Date(+now+TWO_HOURS),state:'queued',active:true,fence:0,attempts:0,createdAt:now,deadline:new Date(+now+300000),leaseUntil:new Date(0)};
   await store.storyboardOperations.insertOne(op,opts);
   if(action==='start')await store.storyboardHeads.updateOne({_id:id},{$set:{ownerId,projectId:id,projectRevision:project.revision,revision:baseRevision,topic:project.topic,settings:{voiceCatalogId:project.voiceCatalogId,captions:project.captions},state:'planning',plan:null,planHash:null,operationId:opId,pendingCandidateId:null,expiresAt}}, {...opts,upsert:true});
   else await store.storyboardHeads.updateOne({_id:id,revision:baseRevision},{$set:{operationId:opId}},opts);
   result={status:202,data:{storyboardId:id,operationId:opId}};
  }else if(action==='cancel'){
   const stopped=await store.storyboardOperations.updateOne({_id:args.operationId,ownerId,boardId:id,active:true},{$set:{active:false,state:'cancelled',expiresAt:new Date(+now+TWO_HOURS)},$unset:{sourcePlan:'',args:''}},opts);
   if(stopped.modifiedCount&&head.operationId===args.operationId)await store.storyboardHeads.updateOne({_id:id},{$set:{state:head.plan?'editable':'cancelled'}},opts);
   result={status:200,data:{cancelled:!!stopped.modifiedCount}};
  }else if(action==='apply'||action==='discard'){
   const candidate=await store.storyboardOperations.findOne({_id:args.operationId,ownerId,boardId:id,state:'succeeded',candidateState:'pending',expiresAt:{$gt:now}},opts);
   if(!candidate||head.pendingCandidateId!==candidate._id||candidate.baseRevision!==head.revision)return fail(409,'CANDIDATE_CHANGED');
   if(project.revision!==head.projectRevision)return fail(409,'DRAFT_CHANGED');
   const fields={pendingCandidateId:null};
   if(action==='apply'){
    fields.plan=checkedStoryboard(candidate.plan);fields.planHash=storyboardHash(fields.plan,head.settings);fields.revision=head.revision+1;
    await store.storyboardSnapshots.insertOne({_id:randomUUID(),ownerId,boardId:id,revision:fields.revision,plan:fields.plan,expiresAt:head.expiresAt},opts);
    await store.storyboardSnapshots.deleteMany({boardId:id,revision:{$lt:fields.revision-2}},opts);
   }
   await store.storyboardHeads.updateOne({_id:id,revision:head.revision},{$set:fields},opts);
   await store.storyboardOperations.updateOne({_id:candidate._id},{$set:{candidateState:action==='apply'?'applied':'discarded'},$unset:{plan:''}},opts);
   result={status:200,data:{revision:fields.revision??head.revision}};
  }else if(action==='generate'){
   if(!head.plan||head.state!=='editable'||head.planHash!==args.planHash)return fail(409,'STORYBOARD_CHANGED');
   if(head.pendingCandidateId||await store.storyboardOperations.findOne({boardId:id,active:true},opts))return fail(409,'RESOLVE_CHANGES_FIRST');
   if(project.status!=='draft'||project.revision!==head.projectRevision)return fail(409,'DRAFT_CHANGED');
   const active=await store.jobs.findOne({ownerId,active:true},opts);if(active)return fail(409,'ACTIVE_JOB_EXISTS');
   if(!narratorChoices().some(v=>v.id===head.settings.voiceCatalogId&&v.available))return fail(422,'VOICE_UNAVAILABLE');
   const plan=checkedStoryboard(head.plan);if(storyboardHash(plan,head.settings)!==head.planHash)return fail(409,'STORYBOARD_CHANGED');
   await store.storyboardHeads.updateOne({_id:id,revision:head.revision},{$inc:{approvals:1}},opts);
   const job={_id:randomUUID(),ownerId,projectId:id,versionId:randomUUID(),key,signature,planHash:head.planHash,storyboardRevision:head.revision,kind:'storyboard',active:true,state:'queued',createdAt:now};
   await store.approvedStoryboards.insertOne({_id:job.versionId,ownerId,jobId:job._id,plan,settings:head.settings,planHash:head.planHash,sourceRevision:head.revision,schemaVersion:1},opts);
   await store.jobs.insertOne(job,opts);
   await store.versions.insertOne({_id:job.versionId,ownerId,projectId:id,number:1,topic:head.topic,settingsSnapshot:head.settings,state:'pending',createdAt:now},opts);
   await store.projects.updateOne({_id:id,revision:head.projectRevision},{$set:{status:'generating',activeJobId:job._id,updatedAt:now},$inc:{revision:1}},opts);
   result={status:202,data:receipt(job)};
  }
  await store.storyboardReceipts.insertOne({_id:commandId,ownerId,signature,result,expiresAt:new Date(+now+2*86400000)},opts);
  return result;
 }));}catch(e){if(e.code!==11000)throw e;const receipt=await store.storyboardReceipts.findOne({_id:commandId});return receipt?(receipt.signature===signature?receipt.result:fail(409,'KEY_REUSED')):fail(409,'STORYBOARD_BUSY');}
}

export async function processStoryboard(store,infer){
 const now=new Date();
 // Timeout and crash recovery release the owner lock even when a provider never returns.
 const expired=await store.storyboardOperations.find({active:true,$or:[{deadline:{$lte:now}},{state:'running',leaseUntil:{$lte:now},attempts:{$gte:2}}]}).toArray();
 for(const op of expired)await settle(store,op,null,'The storyboard request timed out. Your saved plan is unchanged.');
 const op=await store.storyboardOperations.findOneAndUpdate({active:true,deadline:{$gt:now},attempts:{$lt:2},$or:[{state:'queued'},{state:'running',leaseUntil:{$lte:now}}]},{$set:{state:'running',leaseUntil:new Date(+now+60000)},$inc:{fence:1,attempts:1}},{sort:{createdAt:1,_id:1},returnDocument:'after'});
 if(!op)return false;
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),Math.max(1,+op.deadline-Date.now()));
 let pulse=Promise.resolve();
 const timer=setInterval(()=>{pulse=pulse.then(async()=>{
  const ok=await store.storyboardOperations.updateOne({_id:op._id,active:true,fence:op.fence,leaseUntil:{$gt:new Date()}},{$set:{leaseUntil:new Date(Date.now()+60000)}});
  if(!ok.matchedCount)controller.abort();
 }).catch(()=>controller.abort());},15000);
 try{
  const limits=store.limits||store.db.collection('auth_limits');
  // Each provider HTTP call shares this daily pool with brainstorming.
  const reserveCall=async()=>{if(!await reserve(limits,'brainstorm:global:day',60,86400000))throw Error('Provider budget reached');};
  const plan=checkedStoryboard(await infer(op,controller.signal,reserveCall));
  const candidate=op.action==='edit'?scopeCandidate(op.sourcePlan,plan,op.args.scope==='scene'?op.args.sceneId:undefined,op.args.narration):plan;
  controller.signal.throwIfAborted();await settle(store,op,candidate);
 }catch{await settle(store,op,null,'Could not prepare these scenes. Your saved plan is unchanged. Try again.');}
 finally{clearInterval(timer);clearTimeout(timeout);await pulse;}
 return true;
}
async function settle(store,op,plan,error){
 return store.client.withSession(session=>session.withTransaction(async()=>{
  const now=new Date(),opts={session};
  const filter={_id:op._id,active:true,fence:op.fence};
  if(plan)filter.leaseUntil={$gt:now};
  const current=await store.storyboardOperations.findOne(filter,opts);if(!current)return;
  const head=await store.storyboardHeads.findOne({_id:op.boardId,ownerId:op.ownerId,operationId:op._id},opts);
  const project=await store.projects.findOne({_id:op.projectId,ownerId:op.ownerId,status:'draft',revision:op.projectRevision},opts);
  if(!head||!project||head.revision!==op.baseRevision||head.expiresAt<=now||op.deadline<=now){plan=null;error='The saved idea changed or this storyboard expired. Reopen your idea.';}
  const expiresAt=plan&&op.action==='start'?(op.boardExpiresAt||new Date(+now+TWO_HOURS)):head?.expiresAt||new Date(+now+TWO_HOURS);
  const done={active:false,state:plan?'succeeded':'failed',safeError:error??null,expiresAt};
  if(plan&&op.action==='edit'){done.plan=plan;done.candidateState='pending';}
  await store.storyboardOperations.updateOne(filter,{$set:done,$unset:{sourcePlan:'',args:''}},opts);
  if(!head)return;
  const fields={state:head.plan?'editable':plan?'editable':'failed'};
  if(plan&&op.action==='start'){
   Object.assign(fields,{plan,planHash:storyboardHash(plan,head.settings),revision:head.revision+1,expiresAt});
   await store.storyboardSnapshots.insertOne({_id:randomUUID(),ownerId:op.ownerId,boardId:head._id,revision:fields.revision,plan,expiresAt},opts);
   await store.storyboardSnapshots.deleteMany({boardId:head._id,revision:{$lt:fields.revision-2}},opts);
  }else if(plan)fields.pendingCandidateId=op._id;
  await store.storyboardHeads.updateOne({_id:head._id,operationId:op._id},{$set:fields},opts);
 }));
}
export async function loadApprovedStoryboard(store,job){
 const row=await store.approvedStoryboards.findOne({_id:job.versionId,jobId:job._id,ownerId:job.ownerId});
 if(!row||row.schemaVersion!==1||row.planHash!==storyboardHash(checkedStoryboard(row.plan),row.settings))throw Error('Approved storyboard unavailable');
 return row.plan;
}
