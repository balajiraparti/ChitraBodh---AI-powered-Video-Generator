import {config} from 'dotenv';
config({path:'.env',quiet:true});config({path:'dashboard/.env.local',override:true,quiet:true});
const {database}=await import('../dashboard/server/database.mjs');
const {processStoryboard}=await import('../dashboard/server/storyboards.mjs');
const {configuration}=await import('../src/pipeline.ts');
const {Budget,planVideo}=await import('../src/providers.ts');
const {checkedStoryboard,scopeCandidate}=await import('../src/storyboard.ts');
const store=await database();let stopping=false;
process.on('SIGINT',()=>{stopping=true});process.on('SIGTERM',()=>{stopping=true});
console.log('Storyboard worker ready.');
try{while(!stopping){
 const worked=await processStoryboard(store,async(op,signal,reserveCall)=>{
  const budget=new Budget(reserveCall),settings=configuration(undefined,false);
  const context=op.action==='edit'?JSON.stringify({sourceStoryboard:op.sourcePlan,scope:op.args.scope,sceneId:op.args.sceneId,feedback:op.args.feedback,exactNarration:op.args.narration}):'';
  let repair='';
  for(let attempt=0;attempt<2;attempt++){
   try{
    const plan=await planVideo(op.topic,settings,budget,'Create a complete storyboard for review, with explanatory motion in every scene. Target 60–90 seconds, accepting 40–90 seconds. For edits, return the complete plan, preserve all unrequested content and scene IDs, and preserve exactNarration verbatim while repairing animation cue phrases. '+context+'\n'+repair,signal);
    return op.action==='edit'?scopeCandidate(op.sourcePlan,plan,op.args.scope==='scene'?op.args.sceneId:undefined,op.args.narration):checkedStoryboard(plan);
   }catch(e){if(signal.aborted||attempt===1)throw e;repair='Repair validation: '+String(e.message).slice(0,1200);}
  }
 });
 if(!worked)await new Promise(r=>setTimeout(r,1000));
}}finally{await store.client.close();}
