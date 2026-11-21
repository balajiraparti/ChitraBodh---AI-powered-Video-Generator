import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {instagramConfig,instagramScopes,beginInstagram,finishInstagram,disconnectInstagram,safeConnection,sealToken,openToken,exchangeInstagram} from '../dashboard/server/instagram.mjs';
const config={appId:'123',secret:'test-secret',configId:'456',redirectUri:'https://app.example/api/v1/instagram/callback',key:Buffer.alloc(32,7),version:'v24.0'};
const identity={accountId:'123456',username:'creator',scopes:instagramScopes,token:'private-test-token',clientBusinessId:'789',expiresAt:new Date(Date.now()+3600000)};
function memory(){
  const rows=new Map();
  const matches=(row,filter)=>row&&Object.entries(filter).every(([key,value])=>{const actual=key.split('.').reduce((v,k)=>v?.[k],row);return value&&typeof value==='object'?('$gt' in value?actual>value.$gt:('$exists' in value?(actual!==undefined)===value.$exists:false)):actual===value;});
  function change(row,update){for(const [k,v] of Object.entries(update.$set??{}))row[k]=structuredClone(v);for(const k of Object.keys(update.$unset??{}))delete row[k];for(const [k,v] of Object.entries(update.$inc??{}))row[k]=(row[k]??0)+v;}
  return {async findOne(filter){const row=rows.get(filter._id);return matches(row,filter)?structuredClone(row):null;},async updateOne(filter,update,options={}){let row=rows.get(filter._id);if(!row&&options.upsert){row={_id:filter._id,...update.$setOnInsert};rows.set(row._id,row);}if(!matches(row,filter))return {matchedCount:0};change(row,update);return {matchedCount:1};},async findOneAndUpdate(filter,update){const row=rows.get(filter._id);if(!matches(row,filter))return null;const before=structuredClone(row);change(row,update);return before;}};
}
const start=async(collection,owner='owner',session='session',now)=>new URL((await beginInstagram(collection,owner,session,config,now)).authorizationUrl).searchParams.get('state');
async function lifecycle(collection,owner='owner'){
  const state=await start(collection,owner);
  let calls=0;const exchange=async()=>{calls++;return identity;};
  assert.equal(await finishInstagram(collection,owner,'wrong',{state,code:'code'},config,exchange),'invalid');
  assert.equal(await finishInstagram(collection,'other','session',{state,code:'code'},config,exchange),'invalid');
  assert.equal(await finishInstagram(collection,owner,'session',{state,code:'code'},config,exchange),'connected');
  assert.equal(await finishInstagram(collection,owner,'session',{state,code:'code'},config,exchange),'invalid');assert.equal(calls,1);
  const row=await collection.findOne({_id:owner}),safe=safeConnection(row);
  assert.equal(safe.username,'creator');assert.equal(JSON.stringify(safe).includes('private-test-token'),false);
  assert.equal(openToken(row,config.key),identity.token);assert.equal(JSON.stringify(row).includes(identity.token),false);
  assert.equal(safeConnection(row,new Date(Date.now()+7200000)).status,'needs_reconnection');
  const different=await start(collection,owner);
  assert.equal(await finishInstagram(collection,owner,'session',{state:different,code:'code'},config,async()=>({...identity,accountId:'other'})),'different_account');
  assert.equal((await collection.findOne({_id:owner})).accountId,identity.accountId);
  const reconnect=await start(collection,owner);
  assert.equal(await finishInstagram(collection,owner,'session',{state:reconnect,code:'code'},config,exchange),'connected');
  assert.equal((await collection.findOne({_id:owner})).connectionId,row.connectionId);
  const pending=await start(collection,owner);
  assert.equal(await disconnectInstagram(collection,owner,1),false);
  let release;const delayed=new Promise(r=>release=r);
  const finishing=finishInstagram(collection,owner,'session',{state:pending,code:'code'},config,async()=>{await delayed;return identity;});
  // Wait for consumption before disconnecting while provider exchange is in flight.
  while((await collection.findOne({_id:owner})).pending)await new Promise(r=>setTimeout(r,5));
  assert.equal(await disconnectInstagram(collection,owner,2),true);release();
  assert.equal(await finishing,'superseded');
  const disconnected=await collection.findOne({_id:owner});assert.equal(safeConnection(disconnected),null);assert.equal(disconnected.tokenCiphertext,undefined);
  const switching=await start(collection,owner);
  assert.equal(await finishInstagram(collection,owner,'session',{state:switching,code:'code'},config,async()=>({...identity,accountId:'other'})),'connected');
  assert.notEqual((await collection.findOne({_id:owner})).connectionId,row.connectionId);
}
test('Instagram lifecycle protects session, identity, encrypted tokens and disconnect races',async()=>lifecycle(memory()));
test('Instagram expired, denied, failed and superseded authorizations never overwrite connection',async()=>{
  const c=memory(),expired=await start(c,'owner','session',new Date(Date.now()-600001));
  const exchange=async()=>{throw Error('must not run');};
  assert.equal(await finishInstagram(c,'owner','session',{state:expired,code:'c'},config,exchange),'invalid');
  const denied=await start(c);assert.equal(await finishInstagram(c,'owner','session',{state:denied,error:'access_denied'},config,exchange),'cancelled');
  const failed=await start(c);assert.equal(await finishInstagram(c,'owner','session',{state:failed,code:'c'},config,exchange),'failed');
  assert.equal(await finishInstagram(c,'owner','session',{state:failed,code:'c'},config,exchange),'invalid');
  const old=await start(c);await start(c);assert.equal(await finishInstagram(c,'owner','session',{state:old,code:'c'},config,exchange),'invalid');
});
test('Instagram encryption binds credentials to owner and connection',()=>{
  const row={_id:'a',connectionId:'b',...sealToken('token',config.key,'a:b')};
  assert.equal(openToken(row,config.key),'token');assert.throws(()=>openToken({...row,_id:'other'},config.key));assert.throws(()=>openToken(row,Buffer.alloc(32,8)));
  assert.throws(()=>instagramConfig({}));assert.throws(()=>instagramConfig({INSTAGRAM_APP_ID:'1',INSTAGRAM_APP_SECRET:'s',INSTAGRAM_REDIRECT_URI:'http://localhost/api/v1/instagram/callback',INSTAGRAM_TOKEN_KEY:'a'.repeat(64),INSTAGRAM_API_VERSION:'v24.0'}));
});
test('Instagram provider adapter exchanges real HTTP requests and fails closed on permissions and provider errors',async()=>{
  let mode='ok',requests=[];
  const server=createServer(async(req,res)=>{
    let body='';for await(const chunk of req)body+=chunk;requests.push({url:req.url,method:req.method,body,authorization:req.headers.authorization});res.setHeader('Content-Type','application/json');
    if(mode==='unavailable'){res.writeHead(503);res.end('{}');return;}
    const path=new URL(req.url,'http://test').pathname;
    let payload;
    if(path.endsWith('/oauth/access_token'))payload={access_token:'system-token'};
    else if(path.endsWith('/debug_token'))payload={data:{is_valid:mode!=='invalid',app_id:mode==='wrong-app'?'999':'123',expires_at:mode==='expired'?1:mode==='never'?0:Math.floor(Date.now()/1000)+3600,scopes:mode==='missing'?['instagram_basic']:instagramScopes,granular_scopes:mode==='wrong-target'?[{scope:'instagram_content_publish',target_ids:['999']}]:[]}};
    else if(path.endsWith('/assigned_instagram_accounts'))payload={data:mode==='empty'?[]:mode==='multiple'?[{id:'123456',username:'creator'},{id:'987',username:'other'}]:[{id:'123456',username:'creator'}],...(mode==='paging'?{paging:{next:'https://untrusted.example'}}:{})};
    else payload={client_business_id:'789'};
    res.end(JSON.stringify(payload));
  });server.listen(0,'127.0.0.1');await once(server,'listening');
  const fetcher=(url,options)=>{const u=new URL(url);return fetch(`http://127.0.0.1:${server.address().port}${u.pathname}${u.search}`,options);};
  try{
    const value=await exchangeInstagram('code',config,fetcher);
    assert.equal(value.username,'creator');assert.equal(value.clientBusinessId,'789');assert.ok(value.expiresAt>Date.now());
    assert.equal(requests.length,4);assert.match(requests[0].url,/redirect_uri=/);assert.equal(requests[2].authorization,'Bearer system-token');
    for(const failure of ['missing','wrong-app','invalid','wrong-target']){mode=failure;await assert.rejects(exchangeInstagram('c',config,fetcher),/PERMISSIONS/);}
    for(const failure of ['never','expired']){mode=failure;await assert.rejects(exchangeInstagram('c',config,fetcher),/INVALID_RESPONSE/);}
    for(const failure of ['empty','multiple','paging']){mode=failure;await assert.rejects(exchangeInstagram('c',config,fetcher),/SELECT_ONE_ACCOUNT/);}
    mode='unavailable';requests=[];await assert.rejects(exchangeInstagram('c',config,fetcher),/UNAVAILABLE/);assert.equal(requests.length,1);
  }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
test('Instagram lifecycle on isolated Atlas collection',{skip:process.env.TEST_INSTAGRAM_ATLAS!=='1'},async()=>{
  const {config:env}=await import('dotenv');env({path:'dashboard/.env.local',quiet:true});const {MongoClient}=await import('mongodb');
  const client=new MongoClient(process.env.MONGODB_URI,{serverSelectionTimeoutMS:5000});const collection=client.db().collection(`qa_instagram_${randomUUID().replaceAll('-','')}`);
  try{await lifecycle(collection,randomUUID());}finally{await collection.drop().catch(()=>{});await client.close();}
});

test('Unified Login uses configuration ID and never exposes app secret',async()=>{
  const result=await beginInstagram(memory(),'owner','session',config);
  const url=new URL(result.authorizationUrl);
  assert.equal(url.origin,'https://www.facebook.com');assert.equal(url.searchParams.get('config_id'),'456');
  assert.equal(url.searchParams.get('prompt'),'login');assert.equal(url.searchParams.has('client_secret'),false);
  const env={INSTAGRAM_APP_ID:'123',INSTAGRAM_CONFIG_ID:'456',INSTAGRAM_APP_SECRET:'s',INSTAGRAM_REDIRECT_URI:config.redirectUri,INSTAGRAM_TOKEN_KEY:'a'.repeat(64),INSTAGRAM_API_VERSION:'v27.0',BETTER_AUTH_URL:'https://app.example'};
  assert.equal(instagramConfig(env).configId,'456');assert.throws(()=>instagramConfig({...env,INSTAGRAM_CONFIG_ID:''}));
  const c=memory(),state=await start(c);
  assert.equal(await finishInstagram(c,'owner','session',{state,code:'c'},config,async()=>{throw Error('INSTAGRAM_SELECT_ONE_ACCOUNT');}),'select_one_account');
});
