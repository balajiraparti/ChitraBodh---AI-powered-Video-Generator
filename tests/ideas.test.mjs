import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {config} from 'dotenv';
import {parseIdeas,suggestIdeas} from '../dashboard/server/idea-provider.mjs';
import {brainstorm,ideaInput} from '../dashboard/server/ideas.mjs';
import {database} from '../dashboard/server/database.mjs';

const answer={reply:'Try this visual example.',suggestions:['Follow a drop through the water cycle.']};
test('idea provider validates replies and tries the configured Gemini fallback without storing interactions',async()=>{
  const requests=[];
  const send=async(url,init)=>{
    requests.push(JSON.parse(init.body));
    if(requests.length===1)return new Response(null,{status:503});
    return Response.json({status:'completed',steps:[{type:'model_output',content:[{type:'text',text:JSON.stringify(answer)}]}]});
  };
  assert.deepEqual(await suggestIdeas({message:'water'},{GEMINI_API_KEY:'test',GEMINI_MODEL:'primary',GEMINI_FALLBACK_MODELS:'backup'},send),answer);
  assert.deepEqual(requests.map(r=>[r.model,r.store]),[['primary',false],['backup',false]]);
  for(const suggestions of [[],['A','a'],['a','b','c','d'],[42]])assert.throws(()=>parseIdeas(JSON.stringify({...answer,suggestions})));
});
test('conversation context keeps the newest complete pairs within the input limit',()=>{
  const pairs=Array.from({length:8},(_,i)=>({message:String(i),reply:'text'}));
  assert.deepEqual(ideaInput(pairs,'more').history,pairs.slice(-6));
  assert.equal(ideaInput([{reply:'x'.repeat(8000)}],'more').history.length,0);
});
test('brainstorm protects draft ownership, serializes calls, replays results and leaves projects and jobs untouched',{skip:process.env.TEST_IDEAS_ATLAS!=='1'},async()=>{
  config({path:'dashboard/.env.local',quiet:true});
  const db=await database(),owner=randomUUID(),store={...db,limits:db.db.collection('auth_limits')};
  const conversationId=randomUUID(),key=randomUUID(),body={conversationId,message:'why tides change'};
  const {createHash}=await import('node:crypto');
  const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
  const keys=[key],newKey=()=>{const k=randomUUID();keys.push(k);return k;};
  try{
    assert.equal((await brainstorm(store,owner,key,{draftId:'a'.repeat(64),message:'help'})).status,404);
    let release,entered;const started=new Promise(r=>entered=r);
    const first=brainstorm(store,owner,key,body,async()=>{entered();await new Promise(r=>release=r);return answer;});
    await started;
    try{assert.equal((await brainstorm(store,owner,newKey(),body)).error,'COMMAND_IN_PROGRESS');}finally{release();}
    assert.deepEqual((await first).data.suggestions,answer.suggestions);
    const replay=await brainstorm(store,owner,key,body,()=>assert.fail('repeat inference'));
    assert.equal(replay.replayed,true);
    assert.equal((await brainstorm(store,owner,key,{...body,message:'changed'})).error,'KEY_REUSED');
    assert.equal((await brainstorm(store,owner,newKey(),{...body,message:'more'},async input=>{assert.equal(input.history[0].message,body.message);return answer;})).status,200);
    assert.equal((await brainstorm(store,owner,newKey(),body,async()=>{throw Error('provider failure');})).status,503);
    await store.ideaPayloads.updateOne({_id:hash([owner,key])},{$set:{expiresAt:new Date(0)}});
    assert.equal((await brainstorm(store,owner,key,body)).status,410);
    for(let i=0;i<3;i++)assert.equal((await brainstorm(store,owner,newKey(),body,async()=>answer)).status,200);
    assert.equal((await brainstorm(store,owner,newKey(),body)).status,429);
    for(const name of ['projects','jobs'])assert.equal(await store[name].countDocuments({ownerId:owner}),0);
  }finally{
    const ids=keys.map(k=>hash([owner,k]));
    await store.ideaPayloads.deleteMany({_id:{$in:[...ids,hash([owner,conversationId])]}});
    await store.ideaCommands.deleteMany({_id:{$in:ids}});
    await store.limits.deleteOne({_id:createHash('sha256').update('brainstorm:'+owner).digest('hex')});
    await store.client.close();
  }
});
