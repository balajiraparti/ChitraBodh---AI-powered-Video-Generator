import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {RouterContext} from 'next/dist/shared/lib/router-context.shared-runtime';
// @ts-ignore dashboard JSX
import Storyboard from '../dashboard/pages/storyboards/[id]';
import {demoPlan} from '../src/fixtures';
const router:any={pathname:'/storyboards/[id]',query:{id:'board'},asPath:'/storyboards/board',isFallback:false,push:async()=>true,prefetch:async()=>{}};
function render(initial:any){return renderToStaticMarkup(<RouterContext.Provider value={router}><Storyboard id="board" initial={initial} initialError={null}/></RouterContext.Provider>)}
const saved=()=>({id:'board',projectId:'board',revision:1,planHash:'a'.repeat(64),plan:demoPlan,settings:{voiceCatalogId:'adam',captions:true},topic:'Water cycle',state:'editable',expiresAt:new Date(Date.now()+7200000).toISOString(),serverNow:new Date().toISOString(),operation:null,candidate:null,stale:false});
test('storyboard overview renders the actual scene engine and gates active video generation',()=>{
 const html=render(saved());assert.match(html,/Your story, before the video/);assert.match(html,/Water on the move/);assert.match(html,/<svg/);assert.match(html,/estimated/);assert.match(html,/>Generate video<\/button>/);assert.doesNotMatch(html,/<audio|<video|<pre/);
 const busy=render({...saved(),activeJobId:'other'});assert.match(busy,/href="\/jobs\/other"/);assert.match(busy,/<button[^>]*disabled[^>]*>Generate video/);
});
test('planning, candidate review and expiry expose safe recovery instead of false ready media',()=>{
 const loading=render({...saved(),plan:null,state:'planning',operation:{id:'op',state:'running'}});assert.match(loading,/Turning your idea into scenes/);assert.match(loading,/Cancel request/);assert.doesNotMatch(loading,/>Generate video/);
 const candidate=render({...saved(),candidate:demoPlan,candidateId:'candidate'});assert.match(candidate,/Apply changes/);assert.match(candidate,/Discard changes/);assert.doesNotMatch(candidate,/>Generate video/);
 const expired=render({...saved(),expiresAt:new Date(0).toISOString()});assert.match(expired,/preview expired/);assert.match(expired,/Return to saved idea/);assert.doesNotMatch(expired,/<svg|Generate video/);
});
