import {test} from 'node:test';
import assert from 'node:assert/strict';
import {executePipeline} from '../scripts/worker-process.mjs';
const child=new URL('./fixtures/worker-child.mjs',import.meta.url);
test('supervisor forwards progress and waits for child exit',async()=>{
  let pid;
  const stages=[];
  const result=await executePipeline({},async (stage,percent)=>stages.push([stage,percent]),value=>{pid=value},new AbortController().signal,child);
  assert.equal(result.id,'test-result');
  assert.deepEqual(stages,[['Rendering video',undefined],['Rendering video',40]]);
  assert.throws(()=>process.kill(pid,0));
});
test('cancellation stops child before rejecting execution',async()=>{
  const controller=new AbortController();
  let pid;
  await assert.rejects(executePipeline({hang:true},async()=>controller.abort(),value=>{pid=value},controller.signal,child));
  assert.throws(()=>process.kill(pid,0));
});

test('a real generation child exits when its supervisor disconnects before dispatch',async()=>{
  const {fork}=await import('node:child_process');
  const processChild=fork(new URL('../scripts/generation-child.mjs',import.meta.url),[],
    {execArgv:['--import','tsx'],stdio:['ignore','ignore','ignore','ipc']});
  const ended=new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>{processChild.kill();reject(Error('Orphan child stayed alive'));},10000);
    processChild.once('exit',()=>{clearTimeout(timeout);resolve();});
    processChild.once('error',reject);
  });
  processChild.disconnect();
  await ended;
});
