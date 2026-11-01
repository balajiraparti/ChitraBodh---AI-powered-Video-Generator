import test from 'node:test';
import assert from 'node:assert/strict';
import {narrationDurationAccepted} from '../src/video-policy';
import {validateScriptLength} from '../src/providers';
import {demoPlan} from '../src/fixtures';
test('concise 40–59 second narration is accepted without duration rewrite',()=>{
 for(const duration of [40,45,50,59.9,60,75,89.8])assert.equal(narrationDurationAccepted(duration),true);
 for(const duration of [39.99,0,90,NaN,Infinity])assert.equal(narrationDurationAccepted(duration),false);
});
test('shorter complete scripts pass preflight but tiny or oversized scripts fail',()=>{
 const plan=structuredClone(demoPlan);
 const withWords=(n:number)=>{plan.scenes.forEach(s=>s.narration='');plan.scenes[0].narration=Array(n).fill('word').join(' ');return plan;};
 for(const n of [100,125,159,190,240])assert.doesNotThrow(()=>validateScriptLength(withWords(n)));
 for(const n of [99,241])assert.throws(()=>validateScriptLength(withWords(n)),/100–240/);
});
