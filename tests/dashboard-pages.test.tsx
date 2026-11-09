import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {RouterContext} from 'next/dist/shared/lib/router-context.shared-runtime';
// @ts-ignore Next pages are plain JavaScript.
import Create from '../dashboard/pages/create';
// @ts-ignore Next pages are plain JavaScript.
import Job from '../dashboard/pages/jobs/[id]';

test('create page renders the saved draft and progress page renders real stages',()=>{
  const router:any={pathname:'/create',route:'/create',query:{},asPath:'/create',isFallback:false,push:async()=>true,prefetch:async()=>{}};
  const html=renderToStaticMarkup(<RouterContext.Provider value={router}>
    <Create activeJobId="other-job" initial={{id:'draft',topic:'Water cycle',voiceCatalogId:'adam',captions:true,revision:1}} voices={[{id:'adam',name:'Adam',available:true}]}/>
  </RouterContext.Provider>);
  assert.match(html,/Water cycle/);
  assert.match(html,/href="\/jobs\/other-job"/);
  assert.match(html,/<button[^>]*disabled[^>]*>Create video/);
  assert.match(html,/<button class="action">Save draft/);
  const progress=renderToStaticMarkup(<Job initial={{state:'running',stage:'narration',statusUrl:'/api/v1/jobs/test'}}/>);
  assert.match(progress,/Creating narration/);
  assert.match(progress,/Cancel creation/);
});

test('successful jobs show expiry at the deadline and after cleanup',async()=>{
  // @ts-expect-error The dashboard server module is plain JavaScript.
  const {jobStatus}=await import('../dashboard/server/job-status.mjs');
  const expiry=new Date('2026-11-08T12:00:00Z');
  const artifact={_id:'a',ownerId:'owner',state:'ready',expiresAt:expiry};
  const store={artifacts:{findOne:async(filter:any)=>filter._id==='a'&&filter.ownerId==='owner'?artifact:null}};
  const job={_id:'j',ownerId:'owner',state:'succeeded',artifactId:'a'};
  const before=await jobStatus(store,job,new Date(+expiry-1));
  const ready=renderToStaticMarkup(<Job initial={before}/>);
  assert.match(ready,/Your video is ready/);
  assert.match(ready,/<video[^>]+src="\/api\/v1\/media\/a"/);
  assert.match(ready,/href="\/api\/v1\/media\/a\?download=1"/);
  for(const state of ['ready','deleted']){
    artifact.state=state;
    const after=await jobStatus(store,job,expiry);
    assert.equal(after.state,'succeeded');
    assert.equal(after.mediaUrl,null);
    const html=renderToStaticMarkup(<Job initial={after}/>);
    assert.match(html,/Your video has expired/);
    assert.doesNotMatch(html,/Your video is ready|<video|Download MP4/);
    assert.match(html,/href="\/create\?fromJob=j"/);
  }
});
