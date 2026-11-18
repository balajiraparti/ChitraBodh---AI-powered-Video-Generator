import {config} from 'dotenv';
config({path:'dashboard/.env.local',quiet:true});
const {database}=await import('../dashboard/server/database.mjs');
const {ownSlot}=await import('../dashboard/server/jobs.mjs');
const store=await database();
try {
  const token=await ownSlot(store);
  await store.workerSlots.deleteOne({_id:'generation',token});
  console.log('Expired work recovered. Start the generation worker.');
} finally {
  await store.client.close();
}
