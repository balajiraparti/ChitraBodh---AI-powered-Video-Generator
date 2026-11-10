import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {config} from 'dotenv';
import {database} from '../dashboard/server/database.mjs';
import {preferences,updatePreferences} from '../dashboard/server/preferences.mjs';
import {createPage} from '../dashboard/server/create-page.mjs';
import {saveDraft} from '../dashboard/server/drafts.mjs';
test('private preferences persist, reject stale edits and seed only new drafts',{skip:process.env.TEST_PREFERENCES_ATLAS!=='1'},async()=>{
  config({path:'dashboard/.env.local',quiet:true});
  const store=await database(),owner=randomUUID();
  try{
    const old=await saveDraft(store.projects,owner,undefined,{topic:'Earlier idea'},randomUUID());
    const patch=body=>updatePreferences(store.preferences,owner,body);
    assert.equal((await patch({expectedRevision:1,timezone:'Invalid/Zone'})).status,422);
    assert.equal((await patch({expectedRevision:1,captions:false,timezone:'Europe/Paris'})).status,200);
    assert.equal((await patch({expectedRevision:1,captions:true})).status,409);
    const saved=await preferences(store.preferences,owner);
    assert.equal(saved.timezone,'Europe/Paris');
    assert.equal((await createPage(store,owner,{new:'1'})).props.seed.captions,false);
    assert.equal((await createPage(store,owner,{draft:old.data.id})).props.initial.captions,true);
    assert.equal((await preferences(store.preferences,randomUUID())).captions,true);
  }finally{
    await store.projects.deleteMany({ownerId:owner});
    await store.preferences.deleteOne({_id:owner});await store.client.close();
  }
});
