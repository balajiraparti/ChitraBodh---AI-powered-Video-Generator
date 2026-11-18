import test from 'node:test';
import assert from 'node:assert/strict';
import {safeDiagnostic,validationCategory} from '../scripts/generation-diagnostics.mjs';
test('diagnostics allow only fixed categories and provider metadata',()=>{
 const error={provider:'Gemini',status:503,message:'secret key and topic',stack:'secret',candidate:{private:true}};
 assert.deepEqual(safeDiagnostic(error,'Planning scenes'),{code:'GEMINI_503',stage:'Planning scenes',provider:'Gemini',status:503});
 assert.equal(validationCategory({message:'private objects overlap'}),'object_layout');
 assert.equal(safeDiagnostic({code:'private-topic'},'private-topic').code,'GENERATION_FAILED');
});
