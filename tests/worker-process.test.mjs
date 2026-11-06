import {test} from 'node:test';
import assert from 'node:assert/strict';
import {executePipeline} from '../scripts/worker-process.mjs';
const child=new URL('./fixtures/worker-child.mjs',import.meta.url);
test('supervisor forwards progress and waits for child exit',async()=>{
  let pid;
  const stages=[];
  const result=await executePipeline({},async stage=>stages.push(stage),value=>{pid=value},new AbortController().signal,child);
  assert.equal(result.id,'test-result');
  assert.deepEqual(stages,['Rendering video']);
  assert.throws(()=>process.kill(pid,0));
});
test('cancellation stops child before rejecting execution',async()=>{
  const controller=new AbortController();
  let pid;
  await assert.rejects(executePipeline({hang:true},async()=>controller.abort(),value=>{pid=value},controller.signal,child));
  assert.throws(()=>process.kill(pid,0));
});
