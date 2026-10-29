import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateArrayStories,type ArrayEvent,type ArrayStory} from '../src/array-story';
import {arrayDisplay} from '../src/video/ArraySearch';
const event=(action:ArrayEvent['action'],low:number,high:number,mid:number):ArrayEvent=>({action,low,high,mid,phrase:action,occurrence:1});
const correct:ArrayStory={values:[2,4,6,8,10,12,14],target:10,events:[event('show',0,6,-1),event('compare',0,6,3),event('discard_left',0,6,3),event('compare',4,6,5),event('discard_right',4,6,5),event('compare',4,4,4),event('found',4,4,4)]};
test('AI-authored search accepts correct transitions in both directions',()=>{assert.doesNotThrow(()=>validateArrayStories([correct]));});
test('rejects wrong midpoint, wrong elimination, skipped compare and unsorted input',()=>{
 const midpoint=structuredClone(correct);midpoint.events[1].mid=4;assert.throws(()=>validateArrayStories([midpoint]),/midpoint/);
 const decision=structuredClone(correct);decision.events[2].action='discard_right';assert.throws(()=>validateArrayStories([decision]),/elimination/);
 const skipped=structuredClone(correct);skipped.events.splice(1,1);assert.throws(()=>validateArrayStories([skipped]),/Compare/);
 const unsorted=structuredClone(correct);unsorted.values.reverse();assert.throws(()=>validateArrayStories([unsorted]),/increasing/);
});
test('rejects example changes and incomplete searches instead of fabricating a result',()=>{
 const changed=structuredClone(correct);changed.target=11;assert.throws(()=>validateArrayStories([correct,changed]),/changed/);
 const incomplete=structuredClone(correct);incomplete.events.pop();assert.throws(()=>validateArrayStories([incomplete]),/reach/);
 assert.throws(()=>validateArrayStories([correct,undefined]),/Every/);
});
test('not-found requires an exhausted interval',()=>{
 const missing:ArrayStory={values:[1,3,5],target:4,events:[event('compare',0,2,1),event('discard_left',0,2,1),event('compare',2,2,2),event('discard_right',2,2,2),event('not_found',2,1,-1)]};
 assert.doesNotThrow(()=>validateArrayStories([missing]));
 missing.events=[event('not_found',0,2,-1)];assert.throws(()=>validateArrayStories([missing]),/empty/);
});
test('visual state follows timed decisions without eliminating before the speech cue',()=>{
 const timed=correct.events.map((e,i)=>({...e,at:i*5}));
 assert.equal(arrayDisplay(correct.values,timed,9.9).low,0);
 assert.equal(arrayDisplay(correct.values,timed,10).low,4);
 assert.equal(arrayDisplay(correct.values,timed,20).high,4);
 assert.equal(arrayDisplay(correct.values,timed,29.9).found,false);
 assert.equal(arrayDisplay(correct.values,timed,30).found,true);
});
