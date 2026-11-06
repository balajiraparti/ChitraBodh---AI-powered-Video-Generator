import {config} from 'dotenv';
import {hostname} from 'node:os';
config({path:'dashboard/.env.local',quiet:true});
const {database}=await import('../dashboard/server/database.mjs');
const {finishJob}=await import('../dashboard/server/jobs.mjs');
const store=await database();
function alive(pid){
  if(!pid)return false;
  try{process.kill(pid,0);return true;}catch(error){if(error.code==='ESRCH')return false;throw error;}
}
try{
  const slot=await store.workerSlots.findOne({_id:'generation'});
  if(!slot)throw Error('No worker slot to recover');
  if(!process.argv.includes('--confirm-process-tree-stopped'))throw Error('Stop the old worker and all its child/render processes first, then supply --confirm-process-tree-stopped.');
  if(slot.host!==hostname() || alive(slot.pid) || alive(slot.childPid))throw Error('Old worker or child may still be alive. Recovery refused.');
  for await(const job of store.jobs.find({active:true,workerToken:slot.token})){
    await finishJob(store,job,'failed',{safeError:'Creation was interrupted. Your idea is saved.'});
  }
  await store.workerSlots.deleteOne({_id:'generation',token:slot.token});
  console.log('Worker slot recovered. Restart the worker.');
}finally{await store.client.close();}
