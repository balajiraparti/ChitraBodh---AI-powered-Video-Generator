import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {config} from 'dotenv';
import {database} from '../dashboard/server/database.mjs';
import {submitCaptionVariant} from '../dashboard/server/caption-variants.mjs';
import {cancelJob,finishJob} from '../dashboard/server/jobs.mjs';
import {jobStatus} from '../dashboard/server/job-status.mjs';

test('Atlas caption variants preserve source, reuse completed outputs and inherit expiry',
 {skip:process.env.TEST_CAPTIONS_ATLAS!=='1'}, async()=>{
 config({path:'dashboard/.env.local',quiet:true});
 const store=await database(),ownerId=randomUUID(),projectId=randomUUID(),versionId=randomUUID(),artifactId=randomUUID();
 const names=['jobs','versions','projects','artifacts'];
 const prefix='qa_captions_'+randomUUID().replaceAll('-','')+'_';
 for(const name of names)store[name]=store.db.collection(prefix+name);
 await store.jobs.createIndex({ownerId:1,key:1},{unique:true});
 await store.jobs.createIndex({ownerId:1},{unique:true,partialFilterExpression:{active:true}});
 const firstReadyAt=new Date(),expiresAt=new Date(+firstReadyAt+7200000);
 const filter={ownerId,projectId};
 const original={...filter,_id:randomUUID(),versionId,artifactId,state:'succeeded',active:false,createdAt:firstReadyAt};
 try{
 await store.projects.insertOne({_id:projectId,ownerId,revision:1,status:'ready',firstReadyAt,expiresAt,artifactId});
 await store.versions.insertOne({...filter,_id:versionId,number:1,state:'ready',artifactId,topic:'Water',settingsSnapshot:{voiceCatalogId:'adam',captions:true}});
 await store.artifacts.insertOne({...filter,_id:artifactId,state:'ready',expiresAt});
 await store.jobs.insertOne(original);
 let args={sourceVersionId:versionId,captions:false,expectedRevision:1};
 const key=randomUUID();
 assert.equal((await submitCaptionVariant(store,randomUUID(),projectId,key,args)).status,404);
 assert.equal((await submitCaptionVariant(store,ownerId,projectId,key,args)).error,'RENDER_SOURCE_UNAVAILABLE');
 assert.equal(await store.jobs.countDocuments({ownerId}),1);
 await store.artifacts.updateOne({_id:artifactId},{$set:{renderKey:'fixture/render.json'}});
 const [a,b]=await Promise.all([submitCaptionVariant(store,ownerId,projectId,key,args),submitCaptionVariant(store,ownerId,projectId,key,args)]);
 assert.equal(a.status,202);assert.equal(a.data.jobId,b.data.jobId);
 assert.equal((await submitCaptionVariant(store,ownerId,projectId,randomUUID(),args)).error,'ACTIVE_JOB_EXISTS');
 await cancelJob(store,ownerId,a.data.jobId);
 assert.equal((await store.versions.findOne({_id:versionId})).state,'ready');
 async function request(){args.expectedRevision=(await store.projects.findOne({_id:projectId})).revision;const res=await submitCaptionVariant(store,ownerId,projectId,randomUUID(),args);assert.equal(res.status,202);return store.jobs.findOne({_id:res.data.jobId});}
 const failed=await request();await finishJob(store,failed,'failed');
 assert.equal((await store.projects.findOne({_id:projectId})).artifactId,artifactId);
 const success=await request(),newArtifact={...filter,_id:randomUUID(),state:'uploading'};
 await store.artifacts.insertOne(newArtifact);await finishJob(store,success,'succeeded',{},newArtifact);
 assert.equal(+(await store.artifacts.findOne({_id:newArtifact._id})).expiresAt,+expiresAt);
 assert.equal((await store.versions.findOne({_id:versionId})).artifactId,artifactId);
 assert.equal(await store.versions.countDocuments({ownerId}),1);
 assert.equal((await request())._id,success._id);
 const unrelated={_id:randomUUID(),key:randomUUID(),ownerId,projectId:randomUUID(),state:'queued',active:true};
 await store.jobs.insertOne(unrelated);
 assert.equal((await submitCaptionVariant(store,ownerId,projectId,randomUUID(),args)).data.jobId,success._id);
 assert.equal((await submitCaptionVariant(store,ownerId,projectId,randomUUID(),{...args,captions:true})).data.jobId,original._id);
 await store.jobs.deleteOne({_id:unrelated._id});
 const status=await jobStatus(store,await store.jobs.findOne({_id:success._id}));
 assert.equal(status.captions,false);assert.equal(status.versions.length,1);assert.equal(status.sourceJobId,original._id);assert.equal(status.captionVariants.length,3);
 await store.artifacts.updateOne({_id:artifactId},{$set:{expiresAt:new Date(0)}});
 assert.equal((await submitCaptionVariant(store,ownerId,projectId,randomUUID(),args)).status,410);
 }finally{for(const name of names)await store[name].drop();await store.client.close();}
});
