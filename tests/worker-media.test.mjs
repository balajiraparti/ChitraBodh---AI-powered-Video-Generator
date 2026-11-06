import {test} from 'node:test';
import assert from 'node:assert/strict';
import {claimJob,finishJob,cancelJob,ownSlot} from '../dashboard/server/jobs.mjs';
import {expiryFor,canReadMedia,uploadMedia,cleanupMedia,retentionMs} from '../dashboard/server/media.mjs';

function fixture(){
  function match(row,filter){
    return Object.entries(filter).every(([key,value])=>{
      if(value && typeof value==='object' && !(value instanceof Date)){
        if('$ne' in value)return row[key]!==value.$ne;
        if('$lte' in value)return row[key]<=value.$lte;
      }
      return row[key]===value;
    });
  }
  function collection(){
    const rows=[];
    return {rows,
      async findOne(filter){return rows.find(row=>match(row,filter))},
      async insertOne(row){if(rows.some(x=>x._id===row._id))throw Object.assign(Error(),{code:11000});rows.push(structuredClone(row))},
      async updateOne(filter,update){
        const row=rows.find(row=>match(row,filter));if(!row)return {matchedCount:0};
        Object.assign(row,update.$set);
        for(const key of Object.keys(update.$unset||{}))delete row[key];
        return {matchedCount:1};
      },
      async findOneAndUpdate(filter,update,options){
        rows.sort((a,b)=>+a.createdAt-+b.createdAt||a._id.localeCompare(b._id));
        const row=rows.find(row=>match(row,filter));
        if(!row)return null;
        await this.updateOne({_id:row._id},update);
        return structuredClone(row);
      },
      find(filter){return rows.filter(row=>match(row,filter))},
    };
  }
  const store={};
  for(const name of ['workerSlots','jobs','projects','versions','artifacts'])store[name]=collection();
  store.client={withSession:fn=>fn({withTransaction:async work=>{
    const snapshots=Object.fromEntries(Object.entries(store).filter(([name])=>name!=='client').map(([name,col])=>[name,structuredClone(col.rows)]));
    try{return await work()}catch(error){for(const [name,rows] of Object.entries(snapshots))store[name].rows.splice(0,Infinity,...rows);throw error}
  }})};
  return store;
}
function seed(store,id='one'){
  const job={_id:id,ownerId:'alice',projectId:'project-'+id,versionId:'version-'+id,state:'queued',active:true,createdAt:new Date(100)};
  store.jobs.rows.push(job);
  store.projects.rows.push({_id:job.projectId,ownerId:'alice',activeJobId:id});
  store.versions.rows.push({_id:job.versionId});
  return job;
}
test('one supervisor slot, FIFO claim, private cancellation and terminal release',async()=>{
  const store=fixture();
  const token=await ownSlot(store);
  await assert.rejects(ownSlot(store),{code:11000});
  const later=seed(store,'later');later.createdAt=new Date(200);
  const first=seed(store,'first');
  assert.equal((await claimJob(store,token))._id,'first');
  assert.equal(await cancelJob(store,'bob',first._id),null);
  await cancelJob(store,'alice',first._id);
  assert.equal(await finishJob(store,first,'succeeded'),'cancelled');
  assert.equal(store.jobs.rows.find(x=>x._id==='first').active,false);
  assert.equal(store.projects.rows.find(x=>x._id===first.projectId).status,'draft');
  assert.equal((await claimJob(store,token))._id,'later');
});
test('ready commit keeps original expiry and cancellation never publishes an upload',async()=>{
  const store=fixture(),job=seed(store);
  const firstReadyAt=new Date(Date.now()-60000);
  store.projects.rows[0].firstReadyAt=firstReadyAt;
  const blob={_id:'blob',state:'uploading',ownerId:'alice'};
  store.artifacts.rows.push(blob);
  await finishJob(store,job,'succeeded',{},blob);
  assert.equal(+blob.expiresAt,+firstReadyAt+retentionMs);
  assert.equal(canReadMedia(blob,'bob'),false);
  assert.equal(canReadMedia(blob,'alice',blob.expiresAt),false);
  assert.equal(canReadMedia(blob,'alice',new Date(+blob.expiresAt-1)),true);
  const second=seed(store,'second');
  await cancelJob(store,'alice',second._id);
  const discarded={_id:'discarded',state:'uploading'};
  store.artifacts.rows.push(discarded);
  await finishJob(store,second,'succeeded',{},discarded);
  assert.equal(discarded.state,'uploading');
});
test('failed ready transaction rolls back and orphan cleanup retries deletions',async()=>{
  const store=fixture(),job=seed(store);
  store.projects.rows[0].firstReadyAt=new Date(0);
  store.artifacts.rows.push({_id:'old',state:'uploading'});
  await assert.rejects(finishJob(store,job,'succeeded',{},store.artifacts.rows[0]));
  assert.equal(store.jobs.rows[0].active,true);
  const storage={put:async()=>{throw Error('network')},remove:async()=>{throw Error('network')}};
  await assert.rejects(uploadMedia(store,storage,job,'fake.mp4'));
  assert.equal(store.artifacts.rows.length,2);
  const orphan=store.artifacts.rows[1];
  store.jobs.rows[0].active=false;
  const now=new Date(+orphan.expiresAt+1);
  await cleanupMedia(store,storage,now);
  assert.equal(orphan.state,'uploading');
  storage.remove=async()=>{};
  await cleanupMedia(store,storage,now);
  assert.equal(orphan.state,'deleted');
});
test('expiry is exactly two hours after first ready',()=>{
  const first=new Date('2026-11-06T12:00:00Z');
  assert.equal(expiryFor(first,new Date('2026-11-06T13:00:00Z')).expiresAt.toISOString(),'2026-11-06T14:00:00.000Z');
});

test('queued cancellation releases admission without waiting for a worker',async()=>{
  const store=fixture(),job=seed(store);
  const result=await cancelJob(store,'alice',job._id);
  assert.equal(result.state,'cancelled');
  assert.equal(result.active,false);
  assert.equal(store.projects.rows[0].status,'draft');
  const token=await ownSlot(store);
  assert.equal(await claimJob(store,token),null);
});
