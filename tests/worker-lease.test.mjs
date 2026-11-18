import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {MongoClient} from 'mongodb';
import {config} from 'dotenv';
import {ownSlot,renewSlot,claimJob,finishJob,updateJobProgress} from '../dashboard/server/jobs.mjs';

test('Atlas lease takeover fences stale writers and recovers interrupted revisions across hosts',
 {skip:process.env.TEST_WORKER_LEASE_ATLAS!=='1'}, async()=>{
 config({path:'dashboard/.env.local',quiet:true});
 const client=new MongoClient(process.env.MONGODB_URI);
 const db=client.db(),suffix=randomUUID().replaceAll('-',''),store={client};
 const names=['workerSlots','jobs','projects','versions','revisionInputs','artifacts','revisionPlans'];
 for(const name of names)store[name]=db.collection('qa_lease_'+suffix+'_'+name);
 try{
 const old=await ownSlot(store);
 await assert.rejects(ownSlot(store),{code:'WORKER_BUSY'});
 await renewSlot(store,old);
 const job={_id:'first',ownerId:'qa',projectId:'p',versionId:'v',kind:'revision',state:'queued',active:true,createdAt:new Date()};
 await store.jobs.insertOne(job);
 await store.projects.insertOne({_id:'p',activeJobId:'first',status:'ready',artifactId:'original'});
 await store.versions.insertOne({_id:'v',state:'pending'});
 await store.revisionInputs.insertOne({_id:'v'});
 const claimed=await claimJob(store,old);
 await store.workerSlots.updateOne({_id:'generation'},{$set:{leaseUntil:new Date(0),host:'previous-host'}});
 await assert.rejects(finishJob(store,claimed,'succeeded'),{code:'WORKER_LEASE_LOST'});
 await assert.rejects(renewSlot(store,old),{code:'WORKER_LEASE_LOST'});
 const contenders=await Promise.allSettled([ownSlot(store),ownSlot(store)]);
 assert.equal(contenders.filter(r=>r.status==='fulfilled').length,1);
 const winner=contenders.find(r=>r.status==='fulfilled').value;
 assert.notEqual(winner,old);
 assert.equal((await store.jobs.findOne({_id:'first'})).state,'failed');
 assert.equal((await store.projects.findOne({_id:'p'})).artifactId,'original');
 assert.equal((await store.projects.findOne({_id:'p'})).status,'ready');
 assert.equal(await store.revisionInputs.countDocuments({}),0);
 await assert.rejects(updateJobProgress(store,claimed,{stage:'uploading'}),{code:'WORKER_LEASE_LOST'});
 assert.equal(await finishJob(store,claimed,'succeeded'),false);
 await store.jobs.insertOne({...job,_id:'next',kind:'initial',versionId:'v2'});
 assert.equal((await claimJob(store,winner))._id,'next');
 // Upgrade an expired pre-lease singleton from a different host.
 await store.workerSlots.updateOne({_id:'generation'},{$unset:{leaseUntil:''},$set:{heartbeatAt:new Date(0),host:'legacy-host'}});
 const upgrade=await ownSlot(store);assert.notEqual(upgrade,winner);
 assert.equal((await store.jobs.findOne({_id:'next'})).active,false);
 }finally{for(const name of names)await store[name].drop().catch(e=>{if(e.code!==26)throw e});await client.close();}
});
