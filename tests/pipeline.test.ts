import {test,after} from 'node:test';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {demoPlan,fixtureAlignment} from '../src/fixtures';
import {validatePlan,scriptFor} from '../src/contracts';
import {buildTimeline} from '../src/timing';
import {Budget,planVideo,narrate,ProviderError,type ProviderConfig} from '../src/providers';
import {motionState} from '../src/video/WaterCycle';
const testRoot=await mkdtemp(path.join(tmpdir(),'chitrabodh-tests-'));
process.env.CHITRABODH_RUNS_DIR=testRoot;
const {makeRun,saveManifest,assertAvailable,purgeRun,runPath,acquireLock,cleanup}=await import('../src/storage');
after(async()=>{await rm(testRoot,{recursive:true,force:true});});

test('plan rejects dangling edges and missing spoken cue phrases',()=>{
 const plan=structuredClone(demoPlan);plan.scenes[0].edges=[{from:'missing',to:'missing'}];assert.throws(()=>validatePlan(plan));
 const other=structuredClone(demoPlan);other.scenes[0].cues[0].phrase='not spoken';assert.throws(()=>validatePlan(other));
});
test('motion is anchored to actual narration and remains inactive before its cue',()=>{
 const plan=structuredClone(demoPlan);plan.scenes[0].motion!.triggerPhrase='missing phrase';assert.throws(()=>validatePlan(plan));
 const timeline=buildTimeline(demoPlan,fixtureAlignment(),75);assert.ok(timeline.scenes.every(s=>s.motionStart!==undefined&&s.motionStart>=s.start&&s.motionStart<s.end));
 assert.equal(motionState(4,5,'precipitation').rain,false);
 assert.equal(motionState(6,5,'precipitation').rain,true);
 assert.equal(motionState(6,5,'precipitation').evaporation,false);
 assert.equal(motionState(6,5,'collection').collection,true);
 assert.notEqual(motionState(6,5,'evaporation').elapsed,motionState(7,5,'evaporation').elapsed);
});
test('timing maps every scene and caption into the narration duration',()=>{
 const timeline=buildTimeline(demoPlan,fixtureAlignment(),75);
 assert.equal(timeline.scenes[0].start,0);assert.equal(timeline.scenes.at(-1)?.end,75);
 for(const scene of timeline.scenes){assert.ok(scene.end>scene.start);for(const cue of scene.cues)assert.ok(cue.at>=scene.start&&cue.at<scene.end);}
 for(const caption of timeline.captions)assert.ok(caption.start>=0&&caption.end<=75&&caption.end>=caption.start);
 assert.equal(timeline.captions.map(c=>c.text).join(' '),scriptFor(demoPlan).replace(/\s+/g,' '));
});
test('timing fails closed on text mismatch, missing arrays and reversed timestamps',()=>{
 const mismatch=fixtureAlignment();mismatch.characters[0]='Z';assert.throws(()=>buildTimeline(demoPlan,mismatch,75),/mismatch/);
 const bad=fixtureAlignment();bad.character_start_times_seconds[5]=-1;assert.throws(()=>buildTimeline(demoPlan,bad,75),/timestamps/);
 const empty=fixtureAlignment();empty.character_end_times_seconds=[];assert.throws(()=>buildTimeline(demoPlan,empty,75),/arrays/);
});
test('actual HTTP clients send provider contracts and reject quota errors without leaking content',async()=>{
 let fail=false;const requests:{url:string;body:any;headers:any}[]=[];
 const server=createServer(async(req,res)=>{
  let body='';for await(const chunk of req)body+=chunk;
  requests.push({url:req.url!,body:JSON.parse(body),headers:req.headers});res.setHeader('Content-Type','application/json');
  if(fail){res.writeHead(429).end(JSON.stringify({secret:'provider private text'}));return;}
  res.end(JSON.stringify(req.url?.includes('generateContent')?{candidates:[{content:{parts:[{text:JSON.stringify(demoPlan)}]}}]}:{audio_base64:Buffer.alloc(128).toString('base64'),alignment:fixtureAlignment()}));
 });
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 const address=server.address() as {port:number};const base=`http://127.0.0.1:${address.port}`;
 const config:ProviderConfig={geminiKey:'test-gemini',geminiModel:'test-model',elevenKey:'test-eleven',voiceId:'test-voice',voiceModel:'test-tts',geminiBase:base,elevenBase:base};
 try{
  const budget=new Budget();const plan=await planVideo('water cycle',config,budget);const speech=await narrate(plan,config,budget);
  assert.equal(speech.audio.length,128);assert.equal(requests[0].headers['x-goog-api-key'],'test-gemini');assert.equal(requests[1].headers['xi-api-key'],'test-eleven');
  assert.equal(requests[1].body.text,scriptFor(demoPlan));assert.match(requests[1].url,/with-timestamps/);assert.equal(requests[0].body.generationConfig.responseMimeType,'application/json');
  await assert.rejects(()=>planVideo('binary search',config,budget),/arrayStory/);
  assert.ok(requests[2].body.generationConfig.responseJsonSchema.properties.scenes.items.required.includes('arrayStory'));
  fail=true;await assert.rejects(()=>planVideo('test',config,budget),(e:unknown)=>e instanceof ProviderError&&e.status===429&&!e.message.includes('private text'));
 }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
test('request budget prevents a fourth paid narration call',async()=>{const b=new Budget();for(let i=0;i<3;i++)await b.take('elevenlabs');await assert.rejects(()=>b.take('elevenlabs'),/exhausted/);});
test('expired media is denied and generation is serialized',async()=>{
 assert.throws(()=>runPath('../outside'));
 const m=await makeRun('demo',true);
 try{m.state='ready';m.expiresAt=Date.now()-1;await saveManifest(m);await assert.rejects(()=>assertAvailable(m.id),/expired/);assert.ok((await cleanup()).includes(m.id));}finally{await purgeRun(m.id);}
 const release=await acquireLock();try{await assert.rejects(()=>acquireLock(),/already running/);}finally{await release();}
});
test('provider timeout stops a hanging HTTP request',async()=>{
 const server=createServer(()=>{});await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 const address=server.address() as {port:number};
 try{await assert.rejects(()=>planVideo('water cycle',{geminiKey:'test',geminiModel:'test',elevenKey:'test',voiceId:'test',voiceModel:'test',geminiBase:`http://127.0.0.1:${address.port}`,timeoutMs:50},new Budget()),/timeout|aborted/i);}
 finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
test('portal exposes both voices and requires same-origin token before generation',async()=>{
 const {preview}=await import('../src/preview');const {VOICES}=await import('../src/voices');
 let submitted:any;let finish!:(value:any)=>void;
 const server=await preview(0,async options=>{submitted=options;return await new Promise(resolve=>{finish=resolve;});});
 if(!server.listening)await new Promise(resolve=>server.once('listening',resolve));
 const origin=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
 try{
  const page=await (await fetch(origin)).text();for(const voice of VOICES)assert.ok(page.includes(voice.id));
  const token=page.match(/'X-ChitraBodh-Token':"([a-f0-9]+)"/)?.[1];assert.ok(token);
  const body=JSON.stringify({topic:'Water cycle',voice:VOICES[1].id,captions:true});
  assert.equal((await fetch(origin+'/api/generate',{method:'POST',body})).status,403);
  const headers={'Content-Type':'application/json','X-ChitraBodh-Token':token!,Origin:origin};
  assert.equal((await fetch(origin+'/api/generate',{method:'POST',headers,body:JSON.stringify({topic:'test',voice:'unknown',captions:true})})).status,400);
  assert.equal((await fetch(origin+'/api/generate',{method:'POST',headers,body})).status,202);
  assert.equal(submitted.voice,VOICES[1].id);assert.equal(submitted.topic,'Water cycle');
  assert.equal((await fetch(origin+'/api/generate',{method:'POST',headers,body})).status,409);
  finish({});await new Promise(resolve=>setImmediate(resolve));
  assert.equal((await (await fetch(origin+'/api/generation')).json() as any).state,'ready');
 }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
