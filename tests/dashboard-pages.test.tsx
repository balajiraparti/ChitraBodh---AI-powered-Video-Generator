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
    <Create initial={{id:'draft',topic:'Water cycle',voiceCatalogId:'adam',captions:true,revision:1}} voices={[{id:'adam',name:'Adam',available:true}]}/>
  </RouterContext.Provider>);
  assert.match(html,/Water cycle/);
  assert.match(html,/Create video/);
  const progress=renderToStaticMarkup(<Job initial={{state:'running',stage:'narration',statusUrl:'/api/v1/jobs/test'}}/>);
  assert.match(progress,/Creating narration/);
  assert.match(progress,/Cancel creation/);
});
