import {ObjectId} from 'mongodb';
import {config} from 'dotenv';
config({path:'.env',quiet:true});
config({path:'dashboard/.env.local',override:true,quiet:true});
const {database}=await import('../dashboard/server/database.mjs');
const {ownSlot,claimJob,finishJob,pipelineStages}=await import('../dashboard/server/jobs.mjs');
const {executePipeline}=await import('./worker-process.mjs');
const {runPath,purgeRun,cleanup}=await import('../src/storage.ts');
const {narratorChoices}=await import('../dashboard/server/narrators.mjs');
const {objectStorage}=await import('../dashboard/server/r2.mjs');
const {uploadMedia,cleanupMedia}=await import('../dashboard/server/media.mjs');
const storage=objectStorage();
const store=await database();
const token=await ownSlot(store).catch(()=>{throw Error('Generation slot is occupied. Verify the previous worker and child have stopped before recovery.');});
let stopping=false;
let unsafeToRelease=false;
let current;
process.on('SIGINT',()=>{stopping=true;current?.abort();});
process.on('SIGTERM',()=>{stopping=true;current?.abort();});
try{
  while(!stopping){
    await cleanupMedia(store,storage);
    const job=await claimJob(store,token);
    if(!job){await cleanup();await new Promise(r=>setTimeout(r,1000));continue;}
    const controller=new AbortController();
    current=controller;
    let pulse=Promise.resolve();
    const heartbeat=setInterval(()=>{
      pulse=pulse.then(async()=>{
        const updated=await store.workerSlots.updateOne({_id:'generation',token},{$set:{heartbeatAt:new Date()}});
        if(!updated.matchedCount)throw Error('Slot lost');
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
      if(!user||!await store.db.collection('invites').findOne({normalizedEmail:user.email.trim().toLowerCase(),enabled:true}))throw Error('Invitation removed');
      const version=await store.versions.findOne({_id:job.versionId,ownerId:job.ownerId});
      if(!version)throw Error('Missing version');
      if(job.cancelRequested)controller.abort();
      const settings=version.settingsSnapshot;
      if(!narratorChoices().some(v=>v.id===settings.voiceCatalogId&&v.available))throw Error('Voice unavailable');
      const voice=settings.voiceCatalogId==='adam'?(process.env.ELEVENLABS_MALE_VOICE_ID||'pNInz6obpgDQGcFmaJgB'):(process.env.ELEVENLABS_FEMALE_VOICE_ID||'C3aqZfd4M0h7Ys5tWGIS');
      manifest=await executePipeline({demo:false,topic:version.topic,voice,captions:settings.captions},
        async stage=>{
          await store.jobs.updateOne({_id:job._id,active:true,workerToken:token},{$set:{stage:pipelineStages[stage]||'planning'}});
        },pid=>store.workerSlots.updateOne({_id:'generation',token},{$set:{childPid:pid}}),controller.signal);
      controller.signal.throwIfAborted();
      const artifact=await uploadMedia(store,storage,job,runPath(manifest.id)+'/video.mp4',controller.signal);
      controller.signal.throwIfAborted();
      await finishJob(store,job,'succeeded',{},artifact);
    }catch(error){
      if(error.unsafeToRelease){unsafeToRelease=true;throw error;}
      await finishJob(store,job,'failed',{safeError:'We could not finish this video. Your idea is saved.'});
    }finally{
      clearInterval(heartbeat);clearTimeout(timeout);await pulse;
      current=undefined;
      await store.workerSlots.updateOne({_id:'generation',token},{$unset:{jobId:'',childPid:''}});
      if(manifest)await purgeRun(manifest.id);
      await cleanup();
    }
  }
}finally{
  // A terminal-state write failure must leave the slot for explicit recovery.
  if(!unsafeToRelease && !await store.jobs.findOne({active:true,workerToken:token}))await store.workerSlots.deleteOne({_id:'generation',token});
  await store.client.close();
}
