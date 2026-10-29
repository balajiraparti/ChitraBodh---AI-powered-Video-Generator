import path from 'node:path';
import {writeFile,readFile} from 'node:fs/promises';
import {demoPlan,fixtureAlignment} from './fixtures';
import {buildTimeline} from './timing';
import {Budget,narrate,planVideo,ProviderError,type ProviderConfig} from './providers';
import {makeRun,acquireLock,cleanup,saveManifest,runPath,purgeRun,RETENTION_MS,JOB_LIMIT_MS} from './storage';
import {probe,validateMedia} from './media';
import {render} from './render';
import {validatePlan,type VideoProps} from './contracts';
import {VOICES} from './voices';

export function configuration(voice?:string):ProviderConfig{
 const config={geminiKey:process.env.GEMINI_API_KEY||'',geminiModel:process.env.GEMINI_MODEL||'gemini-2.5-flash',elevenKey:process.env.ELEVENLABS_API_KEY||process.env.ELEVEN_LABS_API_KEY||'',voiceId:voice||process.env.ELEVENLABS_VOICE_ID||VOICES[0].id,voiceModel:process.env.ELEVENLABS_MODEL_ID||'eleven_multilingual_v2'};
 if(!config.geminiKey||!config.elevenKey||!config.voiceId)throw new Error('Set GEMINI_API_KEY, ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID in your local .env before live generation. Never paste keys into chat.');
 return config;
}
export async function generate(options:{demo:boolean;topic?:string;voice?:string;captions:boolean;reviewedPlanFile?:string;onProgress?:(state:string)=>void}){
 const config=options.demo?undefined:configuration(options.voice);
 if(!options.demo&&(!options.topic?.trim()||options.topic.length>1000))throw new Error('Provide a topic between 1 and 1,000 characters.');
 const release=await acquireLock();
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),JOB_LIMIT_MS);
 const cancel=()=>controller.abort();process.once('SIGINT',cancel);process.once('SIGTERM',cancel);
 let manifest:Awaited<ReturnType<typeof makeRun>>|undefined;
 try{
  await cleanup();manifest=await makeRun(options.demo?'demo':'live',options.captions);
  const m=manifest,dir=runPath(m.id),signal=controller.signal;
  const state=async(value:string)=>{m.state=value;await saveManifest(m);console.log(value);options.onProgress?.(value);};
  const budget=new Budget(async calls=>{m.calls=calls;await saveManifest(m);});
  let props:VideoProps;
  if(options.demo){props={plan:demoPlan,timeline:buildTimeline(demoPlan,fixtureAlignment(),75),captions:options.captions,demo:true};}
  else {
   let feedback='';let accepted:VideoProps|undefined;
   for(let attempt=0;attempt<3&&!accepted;attempt++){
    await state('Planning scenes');
    let plan;
    try{plan=attempt===0&&options.reviewedPlanFile?validatePlan(JSON.parse(await readFile(options.reviewedPlanFile,'utf8'))):await planVideo(options.topic!,config!,budget,feedback,signal);}
    catch(error){if(error instanceof ProviderError||signal.aborted||attempt===2)throw error;feedback=`Correct the previous plan error, retaining required topic-specific animation fields: ${error instanceof Error?error.message:'invalid plan'}`;continue;}
    await state('Generating narration');
    const narration=await narrate(plan,config!,budget,signal);
    const audioPath=path.join(dir,'narration.mp3');await writeFile(audioPath,narration.audio);
    const {duration}=await probe(audioPath,signal);
    if(duration<60||duration>89.8){feedback=`The previous narration lasted ${duration.toFixed(1)} seconds. Rewrite the complete script to target seventy-five seconds, changing word count by approximately a factor of ${(75/duration).toFixed(2)}. Do not add silence or speed up audio.`;continue;}
    const timeline=buildTimeline(plan,narration.alignment,duration);
    accepted={plan,timeline,audioUrl:`data:audio/mpeg;base64,${narration.audio.toString('base64')}`,captions:options.captions,demo:false};
    await writeFile(path.join(dir,'alignment.json'),JSON.stringify(narration.alignment));
   }
   if(!accepted)throw new Error('Could not produce valid narration within the duration and request budgets.');props=accepted;
  }
  await writeFile(path.join(dir,'plan.json'),JSON.stringify(props.plan,null,2));
  await writeFile(path.join(dir,'timeline.json'),JSON.stringify(props.timeline,null,2));
  await state('Rendering video');await render(props,dir,signal);
  await state('Checking export');const result=await validateMedia(path.join(dir,'video.mp4'),options.demo,signal);
  m.state='ready';m.duration=result.duration;m.readyAt=Date.now();m.expiresAt=m.readyAt+RETENTION_MS;await saveManifest(m);
  console.log(`Ready: ${path.join(dir,'video.mp4')}\nExpires: ${new Date(m.expiresAt).toLocaleString()}\nRun npm run preview to view and keep automatic cleanup running.`);
  return m;
 }catch(error){if(manifest)await purgeRun(manifest.id);throw error;}
 finally{clearTimeout(timeout);process.removeListener('SIGINT',cancel);process.removeListener('SIGTERM',cancel);await release();}
}
