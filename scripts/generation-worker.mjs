import {readFile} from 'node:fs/promises';
import {ObjectId} from 'mongodb';
import {loadRevisionContext} from '../dashboard/server/revisions.mjs';
import {config} from 'dotenv';
config({path:'.env',quiet:true});
config({path:'dashboard/.env.local',override:true,quiet:true});
const {database}=await import('../dashboard/server/database.mjs');
const {ownSlot,renewSlot,updateJobProgress,claimJob,finishJob,pipelineStages}=await import('../dashboard/server/jobs.mjs');
const {executePipeline}=await import('./worker-process.mjs');
const {runPath,purgeRun,cleanup}=await import('../src/storage.ts');
const {narratorChoices}=await import('../dashboard/server/narrators.mjs');
const {objectStorage,artifactStorage}=await import('../dashboard/server/filebase.mjs');
const {uploadMedia,cleanupMedia}=await import('../dashboard/server/media.mjs');
const storage=objectStorage();
const store=await database();
let token;
while (!token) {
  try { token = await ownSlot(store); }
  catch (error) {
    if (error.code !== 'WORKER_BUSY') throw error;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}
let stopping=false;
let unsafeToRelease=false;
let current;
process.on('SIGINT',()=>{stopping=true;current?.abort();});
process.on('SIGTERM',()=>{stopping=true;current?.abort();});
let leasePulse = Promise.resolve();
let lastRenewed = Date.now();
const leaseHeartbeat = setInterval(() => {
  if (Date.now() - lastRenewed >= 25000) {
    stopping = true;
    current?.abort();
  }
  leasePulse = leasePulse.then(async () => {
    if (stopping) return;
    await renewSlot(store, token);
    lastRenewed = Date.now();
  }).catch(() => {
    stopping = true;
    current?.abort();
  });
}, 1000);
try{
  while(!stopping){
    await cleanupMedia(store,artifactStorage);
    const job=await claimJob(store,token);
    if(!job){await cleanup();await new Promise(r=>setTimeout(r,1000));continue;}
    const controller=new AbortController();
    current=controller;
    let pulse=Promise.resolve();
    const heartbeat=setInterval(()=>{
      pulse=pulse.then(async()=>{
        const state=await store.jobs.findOne({_id:job._id,active:true});
        if(!state||state.cancelRequested||stopping)controller.abort();
      }).catch(()=>{stopping=true;controller.abort();});
    },1000);
    const timeout=setTimeout(()=>controller.abort(),20*60*1000);
    let manifest;
    try{
      const userIds=[job.ownerId];
      if(ObjectId.isValid(job.ownerId))userIds.push(new ObjectId(job.ownerId));
      const user=await store.db.collection('user').findOne({_id:{$in:userIds}});
      if(!user)throw Error('Creator account unavailable');
      const version=await store.versions.findOne({_id:job.versionId,ownerId:job.ownerId});
      if(!version)throw Error('Missing version');
      if(job.cancelRequested)controller.abort();
      const settings=version.settingsSnapshot;
      if(job.kind!=='caption' && !narratorChoices().some(v=>v.id===settings.voiceCatalogId&&v.available))throw Error('Voice unavailable');
      const voice=settings.voiceCatalogId==='adam'?(process.env.ELEVENLABS_MALE_VOICE_ID||'pNInz6obpgDQGcFmaJgB'):(process.env.ELEVENLABS_FEMALE_VOICE_ID||'C3aqZfd4M0h7Ys5tWGIS');
      const revisionContext = job.kind === 'revision' ? await loadRevisionContext(store,job) : undefined;
      let renderProps;
      if(job.kind==='caption'){
        const source=await store.artifacts.findOne({_id:job.sourceArtifactId,ownerId:job.ownerId,state:'ready',expiresAt:{$gt:new Date()}});
        if(!source?.renderKey)throw Error('Caption source expired or unavailable');
        const response=await artifactStorage(source).get(source.renderKey,undefined,controller.signal);
        const chunks=[];let bytes=0;
        for await(const chunk of response.Body){
          bytes+=chunk.length;
          if(bytes>32000000){response.Body.destroy();throw Error('Render source too large');}
          chunks.push(chunk);
        }
        renderProps=JSON.parse(Buffer.concat(chunks).toString('utf8'));
      }
      manifest=await executePipeline({demo:false,topic:version.topic,voice,captions:job.kind==='caption'?job.captions:settings.captions,revisionContext,renderProps},
        async (stage,renderPercent)=>{
          const progress = {stage:pipelineStages[stage] || 'planning'};
          if (Number.isInteger(renderPercent)) progress.renderPercent = renderPercent;
          await updateJobProgress(store,job,progress);
        },pid=>renewSlot(store,token,{childPid:pid}),controller.signal);
      controller.signal.throwIfAborted();
      await updateJobProgress(store,job,{stage:'uploading'});
      const artifact=await uploadMedia(store,storage,job,runPath(manifest.id)+'/video.mp4',controller.signal,job.kind==='caption'?undefined:runPath(manifest.id)+'/render.json');
      controller.signal.throwIfAborted();
      const plan=JSON.parse(await readFile(runPath(manifest.id)+'/plan.json','utf8'));
      await finishJob(store,job,'succeeded',{},artifact,plan);
    }catch(error){
      if(error.unsafeToRelease){unsafeToRelease=true;throw error;}
      if(error.diagnostic)console.error(JSON.stringify({event:'generation_failed',jobId:job._id,...error.diagnostic}));
      const safeError = error.code === 'SOURCE_STORYBOARD_UNAVAILABLE'
        ? 'The source storyboard is unavailable. Create a new video using the original topic.'
        : error.diagnostic ? error.message : 'We could not finish this video. Your idea is saved.';
      await finishJob(store,job,'failed',{safeError,...(error.diagnostic ? {diagnostic:error.diagnostic} : {})});
    }finally{
      clearInterval(heartbeat);clearTimeout(timeout);await pulse;
      current=undefined;
      await store.workerSlots.updateOne({_id:'generation',token},{$unset:{jobId:'',childPid:''}});
      if(manifest)await purgeRun(manifest.id);
      await cleanup();
    }
  }
}finally{
  clearInterval(leaseHeartbeat);
  await leasePulse;
  // An unfinished job keeps its slot until expiry and takeover.
  if(!unsafeToRelease && !await store.jobs.findOne({active:true,workerToken:token}))await store.workerSlots.deleteOne({_id:'generation',token});
  await store.client.close();
}
