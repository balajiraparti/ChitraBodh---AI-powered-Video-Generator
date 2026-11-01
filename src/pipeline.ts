import {narrationDurationAccepted,TARGET_VIDEO_SECONDS} from './video-policy';
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
import {currentCredentials} from './credentials';
import {generationFailure} from './generation-errors';

export function configuration(voice?:string):ProviderConfig{
 const storyboardProvider=process.env.AI_PROVIDER||'gemini';
 if(storyboardProvider!=='gemini'&&storyboardProvider!=='nvidia')throw new Error('AI_PROVIDER must be gemini or nvidia.');
 const geminiApi=process.env.GEMINI_API||'interactions';
 if(geminiApi!=='interactions'&&geminiApi!=='generate_content')throw new Error('GEMINI_API must be interactions or generate_content.');
 const config:ProviderConfig={...currentCredentials(),storyboardProvider,geminiApi,nvidiaModel:process.env.NVIDIA_MODEL,geminiModel:process.env.GEMINI_MODEL||'gemini-3.8-flash',geminiFallbackModels:(process.env.GEMINI_FALLBACK_MODELS??'gemini-3.5-flash-lite').split(',').map(s=>s.trim()).filter(Boolean),voiceId:voice||process.env.ELEVENLABS_VOICE_ID||VOICES[0].id,voiceModel:process.env.ELEVENLABS_MODEL_ID||'eleven_multilingual_v2'};
 if(config.storyboardProvider==='nvidia'&&(!config.nvidiaKey||!config.nvidiaModel))throw new Error('Set NVIDIA_API_KEY and NVIDIA_MODEL in .env.');
 if(config.storyboardProvider==='gemini'&&!config.geminiKey)throw new Error('Set GEMINI_API_KEY in .env.');
 if(!config.elevenKey||!config.voiceId)throw new Error('Set ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID in .env.');
 return config;
}
export async function generate(options:{demo:boolean;topic?:string;voice?:string;captions:boolean;reviewedPlanFile?:string;onProgress?:(state:string)=>void}){
 const config=options.demo?undefined:configuration(options.voice);
 if(!options.demo&&(!options.topic?.trim()||options.topic.length>1000))throw new Error('Provide a topic between 1 and 1,000 characters.');
 const release=await acquireLock();
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),JOB_LIMIT_MS);
 const cancel=()=>controller.abort();process.once('SIGINT',cancel);process.once('SIGTERM',cancel);
 let lastStage='Starting generation';
 let manifest:Awaited<ReturnType<typeof makeRun>>|undefined;
 try{
  await cleanup();manifest=await makeRun(options.demo?'demo':'live',options.captions);
  const m=manifest,dir=runPath(m.id),signal=controller.signal;
  const state=async(value:string)=>{lastStage=value;m.state=value;await saveManifest(m);console.log(value);options.onProgress?.(value);};
  const budget=new Budget(async calls=>{m.calls=calls;await saveManifest(m);});
  let props:VideoProps;
  if(options.demo){props={plan:demoPlan,timeline:buildTimeline(demoPlan,fixtureAlignment(),75),captions:options.captions,demo:true};}
  else {
   let feedback='';let accepted:VideoProps|undefined;
   for(let attempt=0;attempt<4&&!accepted;attempt++){
    await state('Planning scenes');
    let plan;
    try{plan=attempt===0&&options.reviewedPlanFile?validatePlan(JSON.parse(await readFile(options.reviewedPlanFile,'utf8'))):await planVideo(options.topic!,config!,budget,feedback,signal);}
    catch(error){if(error instanceof ProviderError||signal.aborted||attempt===3)throw error;console.log(error instanceof Error?error.message:'Invalid storyboard');const candidate=(error as Error & {candidate?:unknown}).candidate;feedback=`Correct the previous plan error, retaining required topic-specific animation fields: ${error instanceof Error?error.message:'invalid plan'}. Previous candidate: ${JSON.stringify(candidate??null).slice(0,24000)}`;continue;}
    await state('Generating narration');
    const narration=await narrate(plan,config!,budget,signal);
    const audioPath=path.join(dir,'narration.mp3');await writeFile(audioPath,narration.audio);
    const {duration}=await probe(audioPath,signal);
    console.log('Narration duration: '+duration.toFixed(1)+' seconds.');
    if(!narrationDurationAccepted(duration)){feedback=`The previous narration lasted ${duration.toFixed(1)} seconds. Rewrite the complete script to target seventy-five seconds (40–90 seconds is acceptable), changing word count by approximately a factor of ${(TARGET_VIDEO_SECONDS/duration).toFixed(2)}. Do not add silence or speed up audio. Keep valid visual objects and repair action phrases to match the revised narration. Previous plan: ${JSON.stringify(plan)}`;continue;}
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
 }catch(error){if(manifest)await purgeRun(manifest.id);throw generationFailure(error,lastStage);}
 finally{clearTimeout(timeout);process.removeListener('SIGINT',cancel);process.removeListener('SIGTERM',cancel);await release();}
}
