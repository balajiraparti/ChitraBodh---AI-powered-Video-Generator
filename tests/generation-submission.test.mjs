import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {submitGeneration} from '../dashboard/server/generations.mjs';

function fixture(){
  function collection(rows=[]){
    return {rows,async findOne(filter){return rows.find(row=>Object.entries(filter).every(([key,value])=>row[key]===value))},
      async insertOne(doc){rows.push({...doc})},
      async updateOne(filter,change){const row=await this.findOne(filter);Object.assign(row,change.$set);row.revision+=change.$inc.revision;}};
  }
  const jobs=collection();
  jobs.insertOne=async function(doc){
    if(this.rows.some(row=>row.ownerId===doc.ownerId && (row.active || row.key===doc.key)))throw Object.assign(Error(),{code:11000});
    this.rows.push(doc);
  };
  return {client:{withSession:fn=>fn({withTransaction:work=>work()})},jobs,versions:collection(),projects:collection()};
}
test('concurrent requests admit one job per creator and retries return its receipt',async()=>{
  const store=fixture(), key=randomUUID(), body={topic:'Water cycle',captions:false};
  const submit=(k,b=body,owner='a')=>submitGeneration(store,owner,k,b);
  const pair=await Promise.all([submit(key),submit(key)]);
  assert.equal(pair[0].status,202);
  assert.deepEqual(pair[0],pair[1]);
  assert.equal((await submit(key,{topic:'Different'})).error,'KEY_REUSED');
  assert.equal((await submit(randomUUID())).error,'ACTIVE_JOB_EXISTS');
  assert.equal(store.versions.rows.length,1);
  assert.equal(store.projects.rows.length,1);
  assert.equal(store.versions.rows[0].settingsSnapshot.captions,false);
  assert.equal((await submit(randomUUID(),body,'b')).status,202);
  const race=await Promise.all([submit(randomUUID(),body,'c'),submit(randomUUID(),body,'c')]);
  assert.deepEqual(race.map(result=>result.status).sort(),[202,409]);
});
test('draft admission checks ownership, revision and voice before queueing',async()=>{
  const store=fixture();
  store.projects.rows.push({_id:'draft',ownerId:'a',status:'draft',revision:3,topic:'Linear search',captions:false});
  const body={projectId:'draft',expectedRevision:3};
  const submit=(owner,extra={})=>submitGeneration(store,owner,randomUUID(),{...body,...extra});
  assert.equal((await submit('b')).status,404);
  assert.equal((await submit('a',{expectedRevision:2})).status,409);
  assert.equal((await submit('a',{voiceCatalogId:'missing'})).status,422);
  assert.equal((await submit('a',{topic:'Ambiguous'})).status,400);
  assert.equal(store.jobs.rows.length,0);
  assert.equal((await submit('a')).status,202);
  assert.equal(store.versions.rows[0].topic,'Linear search');
  assert.equal(store.projects.rows[0].revision,4);
});
