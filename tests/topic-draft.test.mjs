import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readDraft,saveDraft,validTopic} from '../dashboard/server/drafts.mjs';
import {randomUUID} from 'node:crypto';

test('draft validation counts Unicode code points and rejects blank topics',()=>{
  assert.ok(validTopic('🌱'.repeat(2000)));
  for(const bad of ['🌱'.repeat(2001),'   ',null,42])assert.equal(validTopic(bad),false);
});
test('draft ownership, retries and stale writes with an isolated collection',async()=>{
  const rows=new Map();
  function find(filter){
    return [...rows.values()].find(row=>Object.entries(filter).every(([k,v])=>row[k]===v));
  }
  const projects={
    async insertOne(doc){if(rows.has(doc._id))throw Object.assign(Error(),{code:11000});rows.set(doc._id,doc)},
    async findOne(filter){return find(filter)},
    async findOneAndUpdate(filter,change){
      const row=find(filter);
      if(!row)return null;
      Object.assign(row,change.$set);row.revision+=change.$inc.revision;return row;
    }
  };
  const key=randomUUID(), idea={topic:' Explain gravity '};
  const first=await saveDraft(projects,'alice',undefined,idea,key);
  const id=first.data.id;
  assert.equal(first.status,201);
  assert.deepEqual(await readDraft(projects,'alice',id),{id,topic:'Explain gravity',revision:1,voiceCatalogId:'adam',captions:true});
  assert.equal((await saveDraft(projects,'alice',undefined,idea,key)).data.id,id);
  assert.equal(rows.size,1);
  assert.equal((await saveDraft(projects,'alice',undefined,{...idea,captions:false},key)).status,409);
  assert.equal((await saveDraft(projects,'alice',id,{...idea,expectedRevision:1,captions:'false'})).status,400);
  assert.equal((await saveDraft(projects,'alice',id,{...idea,expectedRevision:1,voiceCatalogId:'unknown'})).status,422);
  assert.equal(await readDraft(projects,'bob',id),null);
  const edit={topic:'Explain orbits',expectedRevision:1};
  assert.equal((await saveDraft(projects,'bob',id,edit)).status,404);
  assert.equal((await saveDraft(projects,'alice',id,edit)).data.revision,2);
  assert.equal((await saveDraft(projects,'alice',id,edit)).status,409);
  assert.equal((await readDraft(projects,'alice')).topic,edit.topic);
  const previous=process.env.MONIKA_VOICE_ENABLED;
  try {
    process.env.MONIKA_VOICE_ENABLED='false';
    const options={...edit,expectedRevision:2,voiceCatalogId:'monika-sogam',captions:false};
    assert.equal((await saveDraft(projects,'alice',id,options)).status,422);
    process.env.MONIKA_VOICE_ENABLED='true';
    assert.equal((await saveDraft(projects,'alice',id,options)).status,200);
    await saveDraft(projects,'alice',id,{topic:'New topic',expectedRevision:3});
    const reopened=await readDraft(projects,'alice',id);
    assert.equal(reopened.voiceCatalogId,'monika-sogam');
    assert.equal(reopened.captions,false);
    delete rows.get(id).voiceCatalogId;
    delete rows.get(id).captions;
    const legacy=await readDraft(projects,'alice',id);
    assert.equal(legacy.voiceCatalogId,'adam');
    assert.equal(legacy.captions,true);
  } finally {
    if(previous===undefined)delete process.env.MONIKA_VOICE_ENABLED;
    else process.env.MONIKA_VOICE_ENABLED=previous;
  }
});
