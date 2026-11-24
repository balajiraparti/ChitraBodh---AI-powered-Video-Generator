import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {Readable} from 'node:stream';
import {servePublishingMedia} from '../dashboard/server/publishing-media.mjs';
import {config as dotenv} from 'dotenv';
import {database} from '../dashboard/server/database.mjs';
import {sealToken,disconnectInstagram} from '../dashboard/server/instagram.mjs';
import {publishingProvider} from '../dashboard/server/publishing-provider.mjs';
import {submitPublication,claimPublication,runPublicationStep,resolvePublishingMedia,publicationEligibility,savePublication,publicationView} from '../dashboard/server/publications.mjs';
import {publicationPage} from '../dashboard/server/publication-list.mjs';
const config={appId:'123',secret:'test-secret',version:'v27.0',key:Buffer.alloc(32,3)};
async function mockMeta(){
  const state={mode:'ok',publishCalls:0,createCalls:0,status:'FINISHED',videoUrl:null,caption:null};
  const server=createServer(async(req,res)=>{
    const url=new URL(req.url,'http://test');let body='';for await(const chunk of req)body+=chunk;
    const args=new URLSearchParams(body);res.setHeader('Content-Type','application/json');
    if(state.mode==='unavailable'){res.writeHead(503);return res.end('{}');}
    let result;
    if(url.pathname.endsWith('debug_token'))result={data:{is_valid:true,app_id:'123',expires_at:Math.floor(Date.now()/1000)+3600,scopes:state.mode==='no-scope'?[]:['instagram_basic','instagram_content_publish']}};
    else if(url.pathname.endsWith('content_publishing_limit'))result={data:[{quota_usage:state.mode==='quota'?100:0,config:{quota_total:100}}]};
    else if(url.pathname.endsWith('/media_publish')){state.publishCalls++;state.status='PUBLISHED';if(state.mode==='lost'){req.socket.destroy();return;}result={id:'999',...(state.mode==='warning'?{config_issue:'CAPTION_NOT_ATTACHED'}:{})};}
    else if(url.pathname.endsWith('/media')){state.createCalls++;state.videoUrl=args.get('video_url');state.caption=args.get('caption');result={id:'777'};}
    else if(url.searchParams.get('fields')==='status_code')result={status_code:state.status};
    else if(url.searchParams.get('fields')==='permalink')result={permalink:state.mode==='unsafe-link'?'https://evil.example/':'https://www.instagram.com/reel/test/'};
    else result={id:'456',username:'test_creator'};
    res.end(JSON.stringify(result));
  });
  server.listen(0,'127.0.0.1');await once(server,'listening');
  const fetcher=(url,options)=>fetch('http://127.0.0.1:'+server.address().port+new URL(url).pathname+new URL(url).search,options);
  return {state,provider:publishingProvider(config,fetcher),close:()=>new Promise(r=>{server.close(r);server.closeAllConnections();})};
}
test('Publishing provider uses real HTTP encoding, verifies grants and quota, and never retries a lost publish response',async()=>{
  const m=await mockMeta();try{
    await m.provider.verify('456','secret');
    assert.equal(await m.provider.create('456','secret','https://app.example/video?x=1','Water & sun ☀'),'777');assert.equal(m.state.caption,'Water & sun ☀');
    assert.equal(await m.provider.status('777','secret'),'FINISHED');
    m.state.mode='no-scope';await assert.rejects(m.provider.verify('456','secret'),/RECONNECT_REQUIRED/);
    m.state.mode='quota';await assert.rejects(m.provider.verify('456','secret'),/PUBLISH_LIMIT/);
    m.state.mode='lost';await assert.rejects(m.provider.publish('456','secret','777'));assert.equal(m.state.publishCalls,1);
    assert.equal(await m.provider.status('777','secret'),'PUBLISHED');assert.equal(m.state.publishCalls,1);
    m.state.mode='unsafe-link';await assert.rejects(m.provider.permalink('999','secret'));
  }finally{await m.close();}
});
test('Publication receipt never exposes caption, tokens or media capability',()=>{
  const receipt=publicationView({_id:'test',createdAt:new Date(),mediaExpiresAt:new Date(),description:'private',token:'secret',grantToken:'secret',signature:'secret'});
  assert.equal(JSON.stringify(receipt).includes('secret'),false);assert.equal(JSON.stringify(receipt).includes('private'),false);
});
test('Atlas publishing lifecycle: race deduplication, expiring grants, disconnect fencing, crash recovery and lost responses',{skip:process.env.TEST_PUBLICATIONS_ATLAS!=='1'},async()=>{
  dotenv({path:'dashboard/.env.local',quiet:true});
  const store=await database(),names=['publishJobs','publishPayloads','mediaGrants','instagramConnections','artifacts','projects'];
  const prefix='qa_publish_'+randomUUID().replaceAll('-','')+'_';for(const name of names)store[name]=store.db.collection(prefix+name);
  const m=await mockMeta(),owner=randomUUID(),connectionId=randomUUID(),artifactId=randomUUID(),projectId=randomUUID();
  await store.publishJobs.createIndex({ownerId:1,key:1},{unique:true});
  await store.publishJobs.createIndex({ownerId:1,artifactId:1,accountIdSnapshot:1},{unique:true,partialFilterExpression:{duplicateBlocked:true}});
  const expiresAt=new Date(Date.now()+7200000),args={artifactId,connectionId,description:'Water & sun ☀',confirmed:true,mode:'now'};
  async function advance(id){await store.publishJobs.updateOne({_id:id},{$set:{nextRunAt:new Date(0),leaseUntil:new Date(0)}});const row=await claimPublication(store);assert.equal(row._id,id);await runPublicationStep(store,row,config,m.provider,'https://app.example');return store.publishJobs.findOne({_id:id});}
  async function newArtifact(){const a=randomUUID();await store.artifacts.insertOne({_id:a,ownerId:owner,projectId,versionId:'version',state:'ready',expiresAt});return {...args,artifactId:a};}
  try{
    await store.projects.insertOne({_id:projectId,ownerId:owner,status:'ready'});
    await store.artifacts.insertOne({_id:artifactId,ownerId:owner,projectId,versionId:'version',state:'ready',expiresAt});
    await store.instagramConnections.insertOne({_id:owner,connectionId,accountId:'456',username:'test_creator',revision:1,dispatchEpoch:1,loginFlow:'unified',status:'connected',tokenExpiresAt:expiresAt,scopes:['instagram_content_publish'],...sealToken('test-token',config.key,`${owner}:${connectionId}`)});
    assert.equal((await submitPublication(store,'other',randomUUID(),args)).status,404);
    assert.equal((await submitPublication(store,owner,randomUUID(),{...args,confirmed:false})).status,400);
    assert.equal((await submitPublication(store,owner,randomUUID(),{...args,description:'🙂'.repeat(2201)})).status,400);
    const key=randomUUID(),[a,b]=await Promise.all([submitPublication(store,owner,key,args),submitPublication(store,owner,key,args)]);
    assert.equal(a.status,202);assert.equal(a.data.id,b.data.id);assert.equal((await submitPublication(store,owner,key,{...args,description:'other'})).error,'KEY_REUSED');
    assert.equal((await submitPublication(store,owner,randomUUID(),args)).error,'PUBLICATION_EXISTS');
    let row=await advance(a.data.id);assert.equal(row.state,'processing');
    const grant=m.state.videoUrl.split('/').at(-1);assert.equal((await resolvePublishingMedia(store,grant))._id,artifactId);assert.equal(await resolvePublishingMedia(store,'bad'),null);
    const bytes=Buffer.from('test-video-bytes');
    const mediaServer=createServer((req,res)=>servePublishingMedia(req,res,store,()=>({head:async()=>({ContentLength:bytes.length}),get:async(_key,range)=>{const match=range&&/bytes=(\d+)-(\d+)/.exec(range);return {Body:Readable.from(match?bytes.subarray(Number(match[1]),Number(match[2])+1):bytes)};}}),req.url.slice(1)));
    mediaServer.listen(0,'127.0.0.1');await once(mediaServer,'listening');const mediaUrl='http://127.0.0.1:'+mediaServer.address().port+'/';
    try{
      const full=await fetch(mediaUrl+grant);assert.equal(full.status,200);assert.deepEqual(Buffer.from(await full.arrayBuffer()),bytes);
      const head=await fetch(mediaUrl+grant,{method:'HEAD'});assert.equal(head.headers.get('content-length'),String(bytes.length));assert.equal(await head.text(),'');
      const partial=await fetch(mediaUrl+grant,{headers:{Range:'bytes=-5'}});assert.equal(partial.status,206);assert.deepEqual(Buffer.from(await partial.arrayBuffer()),bytes.subarray(-5));
      const invalid=await fetch(mediaUrl+grant,{headers:{Range:'bytes=99-100'}});assert.equal(invalid.status,416);assert.equal(invalid.headers.get('content-range'),'bytes */'+bytes.length);
      assert.equal((await fetch(mediaUrl+'bad')).status,404);
    }finally{await new Promise(r=>{mediaServer.close(r);mediaServer.closeAllConnections()});}
    assert.equal(await resolvePublishingMedia(store,grant,new Date(+expiresAt+1)),null);
    row=await advance(row._id);assert.equal(row.state,'published');assert.equal(row.mediaId,'999');assert.match(row.permalink,/instagram.com/);assert.equal(m.state.publishCalls,1);
    assert.equal(await resolvePublishingMedia(store,grant),null);assert.equal((await submitPublication(store,owner,randomUUID(),args)).error,'PUBLICATION_EXISTS');
    const lostArgs=await newArtifact(),lost=await submitPublication(store,owner,randomUUID(),lostArgs);m.state.status='FINISHED';await advance(lost.data.id);m.state.mode='lost';row=await advance(lost.data.id);assert.equal(row.state,'outcome_unknown');assert.equal(m.state.publishCalls,2);
    await store.artifacts.updateOne({_id:lostArgs.artifactId},{$set:{expiresAt:new Date(0)}});row=await advance(row._id);assert.equal(row.state,'published');assert.equal(m.state.publishCalls,2);
    m.state.mode='ok';m.state.status='FINISHED';const disconnected=await submitPublication(store,owner,randomUUID(),await newArtifact());await advance(disconnected.data.id);const oldGrant=m.state.videoUrl.split('/').at(-1);
    await disconnectInstagram(store.instagramConnections,owner,1);assert.equal(await resolvePublishingMedia(store,oldGrant),null);row=await advance(disconnected.data.id);assert.equal(row.state,'failed');assert.equal(m.state.publishCalls,2);
    await store.instagramConnections.updateOne({_id:owner},{$set:{status:'connected',tokenExpiresAt:expiresAt,...sealToken('test-token',config.key,`${owner}:${connectionId}`)}});
    const crash=await submitPublication(store,owner,randomUUID(),await newArtifact());let claimed=await claimPublication(store);assert.equal(claimed._id,crash.data.id);assert.equal(await claimPublication(store),null);
    await store.publishJobs.updateOne({_id:claimed._id},{$set:{state:'publishing',containerId:'777',dispatchIntentAt:new Date(),leaseUntil:new Date(0)}});m.state.status='FINISHED';
    const recovered=await claimPublication(store);assert.ok(recovered.fence>claimed.fence);assert.equal(await savePublication(store,claimed,{state:'published'}),false);await runPublicationStep(store,recovered,config,m.provider,'https://app.example');assert.equal((await store.publishJobs.findOne({_id:recovered._id})).state,'outcome_unknown');assert.equal(m.state.publishCalls,2);
    const boundary=new Date(+expiresAt-300000);assert.equal((await publicationEligibility(store,owner,artifactId,connectionId,boundary)).reason,undefined);assert.equal((await publicationEligibility(store,owner,artifactId,connectionId,new Date(+boundary+1))).reason,'TOO_CLOSE_TO_EXPIRY');
    const page=await publicationPage(store,owner,{artifactId,limit:1},'test-secret');assert.equal(page.items.length,1);assert.equal((await publicationPage(store,'other',{artifactId},'test-secret')).items.length,0);
    const old={...await store.publishJobs.findOne({_id:a.data.id}),_id:randomUUID(),key:randomUUID(),duplicateBlocked:false,state:'failed',createdAt:new Date(Date.now()-10000)};await store.publishJobs.insertOne(old);
    const first=await publicationPage(store,owner,{artifactId,limit:1},'test-secret');assert.equal(first.page.hasMore,true);
    const second=await publicationPage(store,owner,{artifactId,limit:1,cursor:first.page.nextCursor},'test-secret');assert.equal(second.items[0].id,old._id);assert.equal(second.page.hasMore,false);
    await assert.rejects(publicationPage(store,'other',{artifactId,cursor:first.page.nextCursor},'test-secret'),/INVALID_CURSOR/);
    await assert.rejects(publicationPage(store,owner,{artifactId,cursor:first.page.nextCursor+'x'},'test-secret'),/INVALID_CURSOR/);
    assert.equal((await submitPublication(store,owner,key,args)).data.id,a.data.id);
  }finally{for(const name of names)await store[name].drop();await m.close();await store.client.close();}
});
