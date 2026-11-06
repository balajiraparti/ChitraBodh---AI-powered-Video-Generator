import {config} from 'dotenv';
config({path:'dashboard/.env.local',quiet:true});
const {database}=await import('../dashboard/server/database.mjs');
const {objectStorage}=await import('../dashboard/server/r2.mjs');
const {cleanupMedia}=await import('../dashboard/server/media.mjs');
const store=await database();
const storage=objectStorage();
let stop=false;
process.on('SIGINT',()=>{stop=true});
process.on('SIGTERM',()=>{stop=true});
try{
  while(!stop){
    try{await cleanupMedia(store,storage);}catch{console.error('Cleanup unavailable; retrying');}
    if(process.argv.includes('--once'))break;
    await new Promise(r=>setTimeout(r,15000));
  }
}finally{await store.client.close();}
