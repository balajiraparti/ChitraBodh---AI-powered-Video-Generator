import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {config} from 'dotenv';
import {database} from '../dashboard/server/database.mjs';
import {projectPage} from '../dashboard/server/library.mjs';

test('Atlas library pagination, ownership and generation states',{skip:process.env.TEST_LIBRARY_ATLAS!=='1'},async()=>{
  config({path:'dashboard/.env.local',quiet:true});
  const store=await database(),ownerId='qa-'+randomUUID(),other='qa-'+randomUUID();
  const at=new Date(),secret=randomUUID(),ids=[0,1,2,3].map(i=>ownerId+i);
  try{
    await store.projects.insertMany(ids.map((_id,i)=>({_id,ownerId,topic:'QA '+i,status:i?'ready':'draft',createdAt:at})));
    await store.jobs.insertMany(ids.slice(1).map((projectId,i)=>({_id:randomUUID(),projectId,ownerId,key:randomUUID(),active:false,
      state:i===0?'running':'succeeded',stage:'narration',artifactId:projectId,createdAt:at})));
    await store.artifacts.insertMany(ids.slice(2).map((_id,i)=>({_id,ownerId,state:'ready',expiresAt:new Date(+at+(i?-10000:10000))})));
    const first=await projectPage(store,ownerId,{limit:'2'},at,secret);
    assert.deepEqual(first.items.map(item=>item.state),['expired','ready']);
    const cursor=first.page.nextCursor;
    for(const [owner,token,time,code] of [[other,cursor,at,'INVALID_CURSOR'],[ownerId,cursor+'x',at,'INVALID_CURSOR'],
      [ownerId,cursor,new Date(+at+900000),'CURSOR_EXPIRED']]){
      await assert.rejects(projectPage(store,owner,{cursor:token},time,secret),{message:code});
    }
    await store.projects.insertOne({_id:randomUUID(),ownerId,createdAt:new Date(+at+1),status:'draft',topic:'later'});
    const second=await projectPage(store,ownerId,{cursor,limit:'2'},at,secret);
    assert.deepEqual(second.items.map(item=>item.id),[ids[1],ids[0]]);
    assert.deepEqual(second.items.map(item=>item.state),['running','draft']);
    assert.equal(second.page.hasMore,false);
    assert.equal((await projectPage(store,other,{},at,secret)).items.length,0);
  }finally{
    try{for(const collection of ['artifacts','jobs','projects'])await store[collection].deleteMany({ownerId});}
    finally{await store.client.close();}
  }
});
