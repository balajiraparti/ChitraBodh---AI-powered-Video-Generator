import test from 'node:test';
import assert from 'node:assert/strict';
import {publicFailure} from '../src/generation-errors';
import {validateScriptLength} from '../src/providers';
import {demoPlan} from '../src/fixtures';
test('short scripts are rejected before narration and valid scripts pass',()=>{
 const short=structuredClone(demoPlan);short.scenes.forEach(s=>s.narration='A short script.');
 assert.throws(()=>validateScriptLength(short),/100–240/);
 validateScriptLength(demoPlan);
 const long=structuredClone(demoPlan);long.scenes[0].narration='word '.repeat(300);
 assert.throws(()=>validateScriptLength(long),/100–240/);
});
test('safe failures identify storyboard, duration, alignment and rendering without leaking raw errors',()=>{
 const cases=[['Planning scenes','Gemini returned an invalid scene plan: secret text','STORYBOARD_INVALID'],['Generating narration','Could not produce valid narration within the duration and request budgets.','DURATION_INVALID'],['Generating narration','Narration/alignment mismatch.','ALIGNMENT_INVALID'],['Rendering video','secret filesystem path','RENDER_FAILED']];
 for(const [stage,message,code] of cases){const result=publicFailure(new Error(message),stage);assert.equal(result.code,code);assert.equal(result.stage,stage);assert.doesNotMatch(result.error,/secret/);}
});
