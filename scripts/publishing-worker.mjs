import {config} from 'dotenv';
config({path:'.env',quiet:true});
config({path:'dashboard/.env.local',override:true,quiet:true});
const {database}=await import('../dashboard/server/database.mjs');
const {instagramConfig}=await import('../dashboard/server/instagram.mjs');
const {claimPublication,runPublicationStep,publishingOrigin}=await import('../dashboard/server/publications.mjs');
const {publishingProvider}=await import('../dashboard/server/publishing-provider.mjs');
const store=await database(),settings=instagramConfig(),provider=publishingProvider(settings),origin=publishingOrigin();
let stopped=false;
process.on('SIGINT',()=>{stopped=true});process.on('SIGTERM',()=>{stopped=true});
console.log('Instagram publishing worker ready');
try{while(!stopped){
  try{const job=await claimPublication(store);if(job)await runPublicationStep(store,job,settings,provider,origin);else await new Promise(r=>setTimeout(r,1000));}
  catch{console.error('Publishing worker step failed; durable lease recovery will retry safely.');await new Promise(r=>setTimeout(r,2000));}
}}finally{await store.client.close();}
