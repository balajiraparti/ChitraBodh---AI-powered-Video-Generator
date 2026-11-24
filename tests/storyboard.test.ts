import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {config} from 'dotenv';
import {demoPlan} from '../src/fixtures';
import {checkedStoryboard,storyboardHash,scopeCandidate,storyboardEstimate} from '../src/storyboard';
// @ts-ignore server is JS
import {database} from '../dashboard/server/database.mjs';
// @ts-ignore server is JS
import {storyboardCommand,readStoryboard,processStoryboard,loadApprovedStoryboard} from '../dashboard/server/storyboards.mjs';
// @ts-ignore server is JS
import {cancelJob} from '../dashboard/server/jobs.mjs';
const plan=()=>structuredClone(demoPlan);
test('storyboard rejects broken cues, unrenderable scenes and out-of-range duration; hashes settings',()=>{
 const p=checkedStoryboard(plan());assert.ok(storyboardEstimate(p).duration>=40);
 const invalid=plan();invalid.scenes[0].narration='This replaces all expected narration cues.';assert.throws(()=>checkedStoryboard(invalid));
 const still=plan();delete still.scenes[0].motion;assert.throws(()=>checkedStoryboard(still),/motion/);
 assert.notEqual(storyboardHash(p,{captions:true}),storyboardHash(p,{captions:false}));
 assert.equal(storyboardHash(p,{captions:true,voice:'a'}),storyboardHash(p,{voice:'a',captions:true}));
});
test('single-scene edit cannot modify other scenes and exact narration is enforced',()=>{
 const source=plan(),candidate=plan();candidate.scenes[0].heading='Changed';candidate.scenes[1].heading='Unrequested';
 const result=scopeCandidate(source,candidate,source.scenes[0].id);
 assert.equal(result.scenes[0].heading,'Changed');assert.deepEqual(result.scenes.slice(1),source.scenes.slice(1));assert.deepEqual(source,plan());
 assert.throws(()=>scopeCandidate(source,candidate,source.scenes[0].id,'Not the same narration'),/exactly/);
});
test('Atlas storyboard lifecycle: replay, isolation, candidates, fencing, fixed expiry and approved snapshot',{skip:process.env.TEST_STORYBOARD_ATLAS!=='1'},async()=>{
 config({path:'dashboard/.env.local',quiet:true});
 const store=await database(),owner=randomUUID(),id=randomUUID(),now=new Date();
 const call=(action:string,args:any,key=randomUUID())=>storyboardCommand(store,owner,id,action,key,args);
 const read=()=>readStoryboard(store,owner,id);
 const clearRate=()=>store.db.collection('auth_limits').deleteOne({_id:createHash('sha256').update('storyboard:'+owner).digest('hex')});
 try{
  await store.db.collection('user').insertOne({_id:owner,email:`${owner}@example.invalid`,brainstormApproved:true});
  await store.projects.insertOne({_id:id,ownerId:owner,status:'draft',topic:'Water cycle',voiceCatalogId:'adam',captions:true,revision:1,createdAt:now});
  const key=randomUUID(),[a,b]=await Promise.all([call('start',{expectedProjectRevision:1},key),call('start',{expectedProjectRevision:1},key)]);
  assert.equal(a.status,202);assert.deepEqual(a,b);assert.equal(await store.storyboardOperations.countDocuments({ownerId:owner}),1);
  assert.equal((await call('start',{expectedProjectRevision:2},key)).error,'KEY_REUSED');
  assert.equal((await readStoryboard(store,'foreign',id)).status,404);
  assert.equal((await storyboardCommand(store,'foreign',id,'cancel',randomUUID(),{operationId:a.data.operationId})).status,404);
  // Scope processing to this test's queue; do not claim a real creator's pending work.
  const scoped={...store,storyboardOperations:new Proxy(store.storyboardOperations,{get(target,prop){if(prop==='findOneAndUpdate')return (filter:any,...args:any[])=>target.findOneAndUpdate({...filter,ownerId:owner},...args);if(prop==='find')return(filter:any,...args:any[])=>target.find({...filter,ownerId:owner},...args);const value=(target as any)[prop];return typeof value==='function'?value.bind(target):value}})};
  assert.equal(await processStoryboard(scoped,async()=>plan()),true);
  let head=(await read()).data;assert.equal(head.revision,1);assert.deepEqual(head.plan,plan());const deadline=+new Date(head.expiresAt),originalHash=head.planHash;
  assert.ok(Math.abs(deadline-Date.now()-7200000)<5000);
  await clearRate();const edit=await call('edit',{expectedRevision:1,scope:'scene',sceneId:'intro',feedback:'Improve title'});assert.equal(edit.status,202);
  const changed=plan();changed.scenes[0].heading='Water keeps moving';changed.scenes[1].heading='Must not change';
  await processStoryboard(scoped,async()=>changed);head=(await read()).data;
  assert.equal(head.planHash,originalHash);assert.deepEqual(head.candidate.scenes[1],plan().scenes[1]);
  assert.equal((await call('generate',{expectedRevision:1,planHash:originalHash,confirmed:true})).error,'RESOLVE_CHANGES_FIRST');
  assert.equal((await call('apply',{expectedRevision:1,operationId:edit.data.operationId})).status,200);
  head=(await read()).data;assert.equal(head.revision,2);assert.equal(+new Date(head.expiresAt),deadline);assert.notEqual(head.planHash,originalHash);
  assert.equal((await call('apply',{expectedRevision:1,operationId:edit.data.operationId})).error,'STORYBOARD_CHANGED');
  await clearRate();const cancel=await call('edit',{expectedRevision:2,scope:'storyboard',feedback:'Simplify'});
  let release:any,started:any;const began=new Promise(r=>started=r),wait=new Promise(r=>release=r);
  const run=processStoryboard(scoped,async()=>{started();await wait;return plan()});await began;
  await call('cancel',{operationId:cancel.data.operationId});release();await run;
  assert.equal((await read()).data.planHash,head.planHash);assert.equal((await read()).data.candidate,null);
  await clearRate();const recover=await call('edit',{expectedRevision:2,scope:'storyboard',feedback:'Simplify'});
  await store.storyboardOperations.updateOne({_id:recover.data.operationId},{$set:{state:'running',attempts:1,fence:1,leaseUntil:new Date(0)}});
  await processStoryboard(scoped,async()=>plan());assert.equal((await read()).data.candidateId,recover.data.operationId);
  await call('discard',{expectedRevision:2,operationId:recover.data.operationId});
  const generationKey=randomUUID();const generated=await call('generate',{expectedRevision:2,planHash:head.planHash,confirmed:true},generationKey);assert.equal(generated.status,202);
  assert.deepEqual(await call('generate',{expectedRevision:2,planHash:head.planHash,confirmed:true},generationKey),generated);
  const job=await store.jobs.findOne({_id:generated.data.jobId});assert.deepEqual(await loadApprovedStoryboard(store,job),head.plan);
  await store.storyboardHeads.updateOne({_id:id},{$set:{expiresAt:new Date(0)}});assert.equal((await read()).status,410);
  assert.deepEqual(await loadApprovedStoryboard(store,job),head.plan,'accepted job survives preview expiry');
  await cancelJob(store,owner,job._id);assert.equal(await store.approvedStoryboards.countDocuments({ownerId:owner}),0);
 }finally{
  for(const name of ['projects','jobs','versions','storyboardHeads','storyboardSnapshots','storyboardOperations','storyboardReceipts','approvedStoryboards'])await store[name].deleteMany({ownerId:owner});
  await store.db.collection('user').deleteOne({_id:owner});await clearRate();await store.client.close();
 }
});
