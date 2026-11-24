import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {randomUUID} from 'node:crypto';
import {MongoClient} from 'mongodb';
import {config} from 'dotenv';

test('Production F16 routes enforce sessions, origin, ownership and durable request replay',{skip:process.env.TEST_PUBLICATIONS_HTTP!=='1',timeout:90000},async()=>{
  config({path:'dashboard/.env.local',quiet:true});
  const dbName='qa_f16_'+randomUUID().replaceAll('-','').slice(0,24);
  const uri=process.env.MONGODB_URI.replace(/(mongodb(?:\+srv)?:\/\/[^/]+)(?:\/[^?]*)?(\?.*)?$/,'$1/'+dbName+'$2');
  assert.notEqual(uri,process.env.MONGODB_URI);
  const origin='https://qa.chitrabodh.invalid',port=3197,local='http://127.0.0.1:'+port;
  const client=new MongoClient(uri),db=client.db();assert.equal(db.databaseName,dbName);
  const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','dashboard','--hostname','127.0.0.1','--port',String(port)],{windowsHide:true,stdio:['ignore','pipe','pipe'],env:{...process.env,MONGODB_URI:uri,BETTER_AUTH_URL:origin,INSTAGRAM_REDIRECT_URI:origin+'/api/v1/instagram/callback'}});
  // Never echo server output: production logs may contain incoming capability paths.
  child.stdout.on('data',()=>{});child.stderr.on('data',()=>{});
  const exited=once(child,'exit');
  const request=(path,cookie='',options={})=>fetch(local+path,{...options,redirect:'manual',headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json',...options.headers}});
  async function register(){const email='qa-'+randomUUID()+'@chitrabodh.test';const res=await request('/api/auth/sign-up','',{method:'POST',body:JSON.stringify({email,password:'Test-'+randomUUID()})});assert.equal(res.status,200);const cookie=res.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ');const user=await db.collection('user').findOne({email});return {id:String(user._id),cookie};}
  try{
    for(let i=0;i<60;i++){try{if((await request('/sign-in')).status===200)break;}catch{}if(child.exitCode!==null)throw Error('QA server exited');await new Promise(r=>setTimeout(r,250));}
    const owner=await register(),other=await register();
    const artifactId=randomUUID(),projectId=randomUUID(),versionId=randomUUID(),jobId=randomUUID(),connectionId=randomUUID(),expiresAt=new Date(Date.now()+7200000);
    await db.collection('projects').insertOne({_id:projectId,ownerId:owner.id,status:'ready',revision:1});
    await db.collection('versions').insertOne({_id:versionId,ownerId:owner.id,projectId,number:1,settingsSnapshot:{captions:true}});
    await db.collection('jobs').insertOne({_id:jobId,key:randomUUID(),ownerId:owner.id,projectId,versionId,artifactId,state:'succeeded',active:false});
    await db.collection('artifacts').insertOne({_id:artifactId,ownerId:owner.id,projectId,versionId,state:'ready',expiresAt});
    await db.collection('instagramConnections').insertOne({_id:owner.id,connectionId,accountId:'456',username:'qa_creator',revision:1,dispatchEpoch:1,status:'connected',loginFlow:'unified',tokenExpiresAt:expiresAt,scopes:['instagram_content_publish']});
    const eligibility='/api/v1/publication-eligibility?artifactId='+artifactId;
    assert.equal((await request(eligibility)).status,401);assert.equal((await request(eligibility,other.cookie)).status,404);
    const eligible=await request(eligibility,owner.cookie);assert.equal(eligible.status,200);assert.equal((await eligible.json()).eligible,true);
    const screen=await request('/publish/'+jobId,owner.cookie);assert.equal(screen.status,200);assert.match(await screen.text(),/Share to Instagram/);
    assert.equal((await request('/publish/'+jobId,other.cookie)).status,404);assert.equal((await request('/publish/'+jobId)).status,307);
    const key=randomUUID(),post={method:'POST',headers:{'Idempotency-Key':key},body:JSON.stringify({artifactId,connectionId,description:'QA only — never dispatched',mode:'now',confirmed:true})};
    assert.equal((await request('/api/v1/publications',owner.cookie,{...post,headers:{...post.headers,Origin:'https://foreign.invalid'}})).status,403);
    assert.equal((await request('/api/v1/publications','',post)).status,401);
    const first=await request('/api/v1/publications',owner.cookie,post);assert.equal(first.status,202);const receipt=await first.json();
    assert.equal((await (await request('/api/v1/publications',owner.cookie,post)).json()).id,receipt.id);
    assert.equal((await request('/api/v1/publications/'+receipt.id,other.cookie)).status,404);
    const list=await (await request('/api/v1/publications?artifactId='+artifactId,owner.cookie)).json();assert.equal(list.items.length,1);assert.equal(JSON.stringify(list).includes('QA only'),false);
    const duplicate=await request('/api/v1/publications',owner.cookie,{...post,headers:{'Idempotency-Key':randomUUID()}});assert.equal(duplicate.status,409);assert.equal((await duplicate.json()).publication.id,receipt.id);
    assert.equal((await request('/api/v1/publishing-media/bad')).status,404);
    // No publishing worker is started: all fixtures are isolated from the pilot database.
  }catch(error){console.error('HTTP QA failure',{name:error.name,code:error.code,actual:error.actual,expected:error.expected});throw error;}
  finally{child.kill();await exited;try{for(const {name} of await db.listCollections().toArray())await db.collection(name).drop();}finally{await client.close();}}
});
