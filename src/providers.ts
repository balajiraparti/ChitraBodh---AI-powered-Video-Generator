import {SCRIPT_SYSTEM_INSTRUCTION,MIN_SCRIPT_WORDS,MAX_SCRIPT_WORDS} from './video-policy';
import {PlanSchema,ICONS,validatePlan,scriptFor,type Plan,type Alignment} from './contracts';
import {z} from 'zod';
import {ILLUSTRATION_PROMPT} from './visual-prompt';
import {validateIllustrationQuality,repairLayout} from './illustration-layout';
import {repairArrayStories,type ArrayStory} from './array-story';

// The model only has to decide the example and the actions; derived search bounds are computed by code.
// Deterministic fixes for common storyboard slips, applied before validation so no model request is spent on them.
export function repairIllustrationDraft(candidate:unknown){
 try{
  const scenes=(candidate as {scenes?:{illustration?:{objects?:any[];actions?:any[]}}[]}).scenes;
  if(!Array.isArray(scenes))return;
  for(const scene of scenes){
   const illustration=scene?.illustration;if(!illustration||!Array.isArray(illustration.objects)||!Array.isArray(illustration.actions))continue;
   const {objects,actions}=illustration;
   const narration=(scene as {narration?:string}).narration;
   if(typeof narration==='string')highlightSilentSentences(narration,objects,actions);
   // Flow and draw only make sense on connectors; on anything else they become a highlight.
   for(const action of actions){
    const target=objects.find(o=>o?.id===action?.targetId);
    if(target&&['flow','draw'].includes(action.action)&&target.kind!=='arrow'&&target.kind!=='line')action.action='ring';
   }
   const scenery=new Set(['hill','soil','arrow','line']);
   const solid=objects.filter(o=>o&&!scenery.has(o.kind));
   const hidden=()=>new Set(actions.filter(a=>a&&['reveal','pop','slide_up'].includes(a.action)).map(a=>a.targetId));
   // A scene must not open empty: keep the objects that would otherwise appear first visible from the start.
   while(solid.filter(o=>!hidden().has(o.id)).length<2){
    const index=actions.findIndex(a=>a&&['reveal','pop','slide_up'].includes(a.action)&&solid.some(o=>o.id===a.targetId));
    if(index<0)break;actions.splice(index,1);
   }
   // Every scene needs motion: send particles along its first connector on an existing speech cue.
   if(!actions.some(a=>a&&['move','flow','draw'].includes(a.action))){
    const connector=objects.find(o=>o&&(o.kind==='arrow'||o.kind==='line')&&o.fromId&&o.toId),cue=actions.find(a=>a&&typeof a.phrase==='string');
    if(connector&&cue)actions.push({targetId:connector.id,action:'flow',phrase:cue.phrase,occurrence:cue.occurrence??1,duration:2.5,repeat:false});
   }
  }
 }catch{/* validation reports malformed plans */}
}
function repairDerivedFields(candidate:unknown){
 repairIllustrationDraft(candidate);
 try{
  const scenes=(candidate as {scenes?:{arrayStory?:ArrayStory}[]}).scenes;
  if(!Array.isArray(scenes)||!scenes.length||!scenes.every(s=>s?.arrayStory&&Array.isArray(s.arrayStory.values)&&Array.isArray(s.arrayStory.events)&&s.arrayStory.events.every(e=>e&&typeof e==='object')))return;
  repairArrayStories(scenes.map(s=>s.arrayStory));
 }catch{/* validation reports malformed plans */}
}
// A sentence with no visual change gets a highlight ring on the object it names, on an exact phrase from that sentence.
function highlightSilentSentences(narration:string,objects:any[],actions:any[]){
 for(const piece of narration.matchAll(/[^.!?]+[.!?]*/g)){
  if(actions.length>=12)return;
  const start=piece.index!,text=piece[0];
  const covered=actions.some(a=>{if(!a||typeof a.phrase!=='string')return false;let at=-1;for(let i=0;i<(a.occurrence??1);i++){at=narration.indexOf(a.phrase,at+1);if(at<0)return false;}return at>=start&&at<start+text.length;});
  if(covered)continue;
  for(const object of objects){
   if(!object||object.kind==='arrow'||object.kind==='line'||typeof object.label!=='string')continue;
   const hit=object.label.split(/\s+/).filter((w:string)=>w.length>=4).map((w:string)=>text.match(new RegExp('\\b'+w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','i'))).find(Boolean);
   if(!hit)continue;
   const phrase=hit[0],absolute=start+hit.index!;let occurrence=1,from=-1;
   while((from=narration.indexOf(phrase,from+1))>=0&&from<absolute)occurrence++;
   actions.push({targetId:object.id,action:'ring',phrase,occurrence,duration:1.4,repeat:false});break;
  }
 }
}
const signature=(o:{kind:string;label:string})=>`${o.kind}:${o.label.toLowerCase()}`;
function validateVisualQuality(plan:Plan){
 let previous=new Set<string>();
 for(const scene of plan.scenes){
  if(!scene.illustration)continue;
  const current=scene.illustration.objects.filter(o=>o.kind!=='arrow'&&o.kind!=='line').map(signature);
  if(previous.size&&current.every(s=>previous.has(s)))throw new Error(`Scene "${scene.id}" shows exactly the same objects as the scene before it. Add at least one NEW object that illustrates what this scene explains (for example a lock for a PIN, a coin for money, a check for success).`);
  previous=new Set(current);
  try{repairLayout(scene.illustration);validateIllustrationQuality(scene.illustration,scene.narration);}
  catch(error){throw new Error(`Scene "${scene.id}": ${error instanceof Error?error.message:'visual layout is invalid.'}`);}
 }
}

export type ProviderConfig={storyboardProvider?:'gemini'|'nvidia';nvidiaKey?:string;nvidiaModel?:string;nvidiaBase?:string;geminiKey:string;geminiApi?:'interactions'|'generate_content';geminiModel:string;geminiFallbackModels?:string[];elevenKey:string;elevenFallbackKeys?:string[];voiceId:string;voiceModel:string;geminiBase?:string;elevenBase?:string;timeoutMs?:number};
export class ProviderError extends Error {
 code?:string;
 constructor(public provider:string,public status:number){
  const reason=status===503?'The provider is temporarily unavailable or overloaded. Try again later.':status===429?'The provider rate limit or quota was reached.':status===401||status===403?'The configured key was rejected or lacks permission.':status===404?'The requested model or resource is unavailable.':'Check the provider configuration.';
  super(provider+' request failed ('+status+'). '+reason);
 }
}
export class Budget {
  calls={gemini:0,nvidia:0,elevenlabs:0};
  unavailableGeminiModels=new Set<string>();
  selectedGeminiModel?:string;
  exhaustedElevenKeys=new Set<string>();
  constructor(private onChange:(counts:Budget['calls'])=>Promise<void>=async()=>{}){}
  async take(name:keyof Budget['calls']) {const limit=name==='elevenlabs'?3:4;const used=name==='elevenlabs'?this.calls.elevenlabs:this.calls.gemini+this.calls.nvidia;if(used>=limit)throw new Error(`${name} request budget exhausted.`);this.calls[name]++;await this.onChange({...this.calls});}
}
async function request(url:string,headers:Record<string,string>,body:unknown,provider:string,budget:Budget,name:keyof Budget['calls'],timeoutMs:number,signal?:AbortSignal):Promise<any> {
  await budget.take(name);
  const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body),signal:AbortSignal.any([AbortSignal.timeout(timeoutMs),...(signal?[signal]:[])])});
  if(!response.ok){
    // Only expose the provider's bounded diagnostic, never raw response bodies or keys.
    const payload=await response.json().catch(()=>null) as any;
    const error=new ProviderError(provider,response.status);
    const code=payload?.detail?.status??payload?.error?.status;if(typeof code==='string'&&/^[a-zA-Z_]{1,80}$/.test(code)){error.code=code;error.message+=` Code: ${code}.`;}
    if(provider==='ElevenLabs'&&code==='payment_required')error.message='ElevenLabs requires a paid plan to use this library voice through the API. Enable an eligible plan or choose an API-accessible voice.';
    if(response.status===400){let detail=String(payload?.error?.message||'');for(const value of Object.values(headers))if(value){detail=detail.split(value).join('[redacted]');if(value.startsWith('Bearer '))detail=detail.split(value.slice(7)).join('[redacted]');}error.message+=` ${detail.slice(0,600)}`;}
    throw error;
  }
  if(Number(response.headers.get('content-length')??0)>32_000_000){await response.body?.cancel();throw new Error('Provider response exceeds limit.');}
  const reader=response.body?.getReader();if(!reader)throw new Error('Empty provider response.');
  const chunks:Uint8Array[]=[];let total=0;
  while(true){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>32_000_000){await reader.cancel();throw new Error('Provider response exceeds limit.');}chunks.push(value);}
  try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new Error('Provider returned invalid JSON.');}
}
export async function planVideo(topic:string,config:ProviderConfig,budget:Budget,feedback='',signal?:AbortSignal):Promise<Plan> {
 if(config.storyboardProvider==='nvidia'){if(!config.nvidiaKey||!config.nvidiaModel)throw new Error('Set NVIDIA_API_KEY and NVIDIA_MODEL in .env.');return planVideoForModel(topic,config,budget,feedback,signal);}
 const models=[...new Set([config.geminiModel,...(config.geminiFallbackModels??[])])];
 let lastError:unknown;
 for(const model of models){
  if(budget.unavailableGeminiModels.has(model))continue;
  if(signal?.aborted)throw signal.reason;
  budget.selectedGeminiModel=model;
  try{return await planVideoForModel(topic,{...config,geminiModel:model},budget,feedback,signal);}
  catch(error){
   const eligible=error instanceof ProviderError&&error.provider==='Gemini'&&[404,429,500,502,503,504].includes(error.status)||error instanceof Error&&error.name==='TimeoutError';
   if(signal?.aborted||!eligible)throw error;
   budget.unavailableGeminiModels.add(model);lastError=error;
   console.log('Gemini model unavailable: '+model+'; checking configured fallback.');
  }
 }
 if(lastError)throw lastError;
 throw new ProviderError('Gemini',503);
}
async function planVideoForModel(topic:string,config:ProviderConfig,budget:Budget,feedback='',signal?:AbortSignal):Promise<Plan> {
  // Keep provider decoding constraints small; enforce all bounds locally afterward.
  const schema=JSON.parse(JSON.stringify(z.toJSONSchema(PlanSchema),(key,value)=>['$schema','minItems','maxItems','minLength','maxLength','pattern'].includes(key)?undefined:value));
  const binary=/binary\s+search/i.test(topic);
  const sceneSchema=schema.properties.scenes.items;
  const requiredVisual=binary?'arrayStory':'illustration';
  sceneSchema.required=[...new Set([...sceneSchema.required,requiredVisual])];
  delete sceneSchema.properties.motion;
  delete sceneSchema.properties[binary?'illustration':'arrayStory'];
  for(const key of ['nodes','edges','cues'])sceneSchema.properties[key]={type:'array',items:sceneSchema.properties[key].items,maxItems:0};
  sceneSchema.properties.narration.minLength=100;
  const shared=`Create a beginner-friendly 60–90 second educational explainer, about 190–215 spoken words. Topic: ${JSON.stringify(topic)}. You decide the complete example, script, storyboard, positions and visual sequence. Target 190–210 spoken words TOTAL; a clear shorter script of 100–240 words is acceptable for the supported 40–90 second range. Use four or five scenes. EVERY scene narration MUST be four or five full sentences of 45–60 words (count them: scenes under 40 words are rejected, and the total must be at least 190 words). Mention the key objects by name in the first sentence of each scene. Expand with useful explanation, a worked example and a recap rather than filler. Count only narration words, not labels or JSON. Return 4–6 scenes, each with a short heading (under 45 characters), spoken narration, layout process_diagram, and empty nodes=[], edges=[], cues=[]. IDs start with a lowercase letter and contain only lowercase letters, digits and underscores. All action phrases must be exact case-sensitive substrings of their scene narration; occurrence is one-based. Choose phrases early enough to let viewers watch each action. Speak numbers and symbols as words. Keep facts accurate. No executable code or external assets. Do not use generic icons as substitutes for objects (for example a chip is not an animal).`;
  const visual=binary?`Every scene MUST have arrayStory. Independently choose 5–9 sorted, distinct integers in 0..99 and a target PRESENT in the array requiring at least three comparisons, unless absence was explicitly requested. Keep values and target identical throughout. Author all events: show, compare, discard_left, discard_right, found, not_found, with low, high, mid, phrase, occurrence. Indices start at zero. Initial low=0, high=length-1. compare mid=floor((low+high)/2). Decisions use the SAME low/high/mid as the preceding compare. If values[mid]<target: discard_left; next low=mid+1. If greater: discard_right; next high=mid-1. If equal: found. Each compare must have its own subsequent decision at a distinct later speech phrase. Show uses current bounds and mid=-1. After found only a recap show is allowed. not_found requires low>high and mid=-1. Use introduction, a scene per comparison, and recap. Explain sorted input, zero-based indices, rounding down, and each eliminated range. Do not omit arrayStory during repair.`:
  ILLUSTRATION_PROMPT;
  const prompt=shared+' '+visual+' '+feedback;
  const provider=config.storyboardProvider==='nvidia'?'NVIDIA':'Gemini';
  let text:string;
  if(provider==='NVIDIA'){
   const data=await request((config.nvidiaBase??'https://integrate.api.nvidia.com/v1').replace(/\/$/,'')+'/chat/completions',{'Authorization':'Bearer '+config.nvidiaKey},
    {model:config.nvidiaModel,messages:[{role:'system',content:SCRIPT_SYSTEM_INSTRUCTION},{role:'user',content:prompt}],temperature:0.2,max_tokens:16384,reasoning_effort:'none',stream:false,response_format:{type:'json_schema',json_schema:{name:'video_storyboard',schema}}},
    'NVIDIA',budget,'nvidia',config.timeoutMs??120000,signal);
   const choice=data.choices?.[0];
   if(choice?.finish_reason==='length')throw new Error('NVIDIA returned an invalid scene plan: output was truncated. Use fewer objects and actions while retaining the complete narration.');
   text=typeof choice?.message?.content==='string'?choice.message.content:'';
  }else if(config.geminiApi==='interactions'){
   const data=await request((config.geminiBase??'https://generativelanguage.googleapis.com/v1beta').replace(/\/$/,'')+'/interactions',{'x-goog-api-key':config.geminiKey},
    {model:config.geminiModel,system_instruction:SCRIPT_SYSTEM_INSTRUCTION,input:prompt,store:false,stream:false,generation_config:{temperature:0.2,max_output_tokens:16384},response_format:{type:'text',mime_type:'application/json',schema}},
    'Gemini',budget,'gemini',config.timeoutMs??90000,signal);
   text=interactionText(data);
  }else{
   const data=await request(`${config.geminiBase??'https://generativelanguage.googleapis.com/v1beta'}/models/${encodeURIComponent(config.geminiModel)}:generateContent`,{'x-goog-api-key':config.geminiKey},{systemInstruction:{parts:[{text:SCRIPT_SYSTEM_INSTRUCTION}]},contents:[{role:'user',parts:[{text:prompt}]}],generationConfig:{temperature:0.2,responseMimeType:'application/json',responseJsonSchema:schema}},'Gemini',budget,'gemini',config.timeoutMs??90000,signal);
   const parts=data.candidates?.[0]?.content?.parts;
   text=Array.isArray(parts)?parts.filter((p:any)=>!p.thought&&typeof p.text==='string').map((p:any)=>p.text).join(''):'';
  }
  if(!text)throw new Error(provider+' returned no usable plan.');
  let candidate:unknown;try{candidate=JSON.parse(text);repairDerivedFields(candidate);const plan=validatePlan(candidate);validateScriptLength(plan);validateVisualQuality(plan);if(!plan.scenes.every(s=>s.illustration||s.arrayStory||s.motion))throw new Error('Every scene requires an illustrated or array storyboard; icon-only fallback is forbidden.');if(/binary\s+search/i.test(topic)&&!plan.scenes.every(s=>s.arrayStory))throw new Error('Binary-search output MUST contain arrayStory with values, target and events in EVERY scene. Do not omit it during repair.');return plan;}catch(error){const reason=error instanceof z.ZodError?error.issues.map(i=>{const limit=(i as {minimum?:unknown;maximum?:unknown});return `${i.path.join('.')}: ${i.code}${limit.minimum!==undefined?` (minimum ${String(limit.minimum)})`:''}${limit.maximum!==undefined?` (maximum ${String(limit.maximum)})`:''}`;}).join('; '):error instanceof Error?error.message:'Invalid JSON';const failure=new Error(`${provider} returned an invalid scene plan: ${reason.slice(0,600)}`) as Error & {candidate?:unknown};failure.candidate=candidate;throw failure;}
}
export function validateScriptLength(plan:Plan){
 const words=scriptFor(plan).trim().split(/\s+/).length;
 if(words<MIN_SCRIPT_WORDS||words>MAX_SCRIPT_WORDS)throw new Error('Narration has '+words+' words; write 100–240 spoken words total, aiming for 190–210. Add meaningful explanation and an example if too short. Preserve the visual storyboard and update exact speech cues.');
}
export async function narrate(plan:Plan,config:ProviderConfig,budget:Budget,signal?:AbortSignal):Promise<{audio:Buffer;alignment:Alignment}> {
 const keys=[...new Set([config.elevenKey,...(config.elevenFallbackKeys??[])])].filter(Boolean);
 for(let i=0;i<keys.length;i++){
  if(signal?.aborted)throw signal.reason;
  if(budget.exhaustedElevenKeys.has(keys[i]))continue;
  try{return await narrateWithKey(plan,{...config,elevenKey:keys[i]},budget,signal);}
  catch(error){if(!(error instanceof ProviderError)||error.code!=='quota_exceeded'||i===keys.length-1||signal?.aborted)throw error;
   budget.exhaustedElevenKeys.add(keys[i]);
   console.log('ElevenLabs credits exhausted; trying configured backup '+(i+1)+'.');}
 }
 throw new Error('No ElevenLabs key configured.');
}
async function narrateWithKey(plan:Plan,config:ProviderConfig,budget:Budget,signal?:AbortSignal):Promise<{audio:Buffer;alignment:Alignment}> {
  const data=await request(`${config.elevenBase??'https://api.elevenlabs.io/v1'}/text-to-speech/${encodeURIComponent(config.voiceId)}/with-timestamps?output_format=mp3_44100_128`,{'xi-api-key':config.elevenKey},{text:scriptFor(plan),model_id:config.voiceModel},'ElevenLabs',budget,'elevenlabs',config.timeoutMs??90000,signal);
  if(typeof data.audio_base64!=='string'||!data.audio_base64.length)throw new Error('ElevenLabs returned no audio.');
  const alignment=data.alignment??data.normalized_alignment;
  if(!alignment||!Array.isArray(alignment.characters))throw new Error('ElevenLabs returned no speech alignment.');
  const audio=Buffer.from(data.audio_base64,'base64');if(audio.length<100)throw new Error('ElevenLabs audio is empty or invalid.');
  return {audio,alignment};
}

export function interactionText(data:any):string {
 if(data?.status!=='completed')throw new Error('Gemini returned an incomplete interaction; no storyboard was accepted.');
 const outputs=Array.isArray(data.steps)?data.steps.filter((step:any)=>step.type==='model_output'):[];
 const final=outputs.at(-1);
 const parts=final?.content;
 if(!Array.isArray(parts)||!parts.length||parts.some((part:any)=>part.type!=='text'||typeof part.text!=='string'))throw new Error('Gemini returned no usable plan in the completed interaction.');
 const text=parts.map((part:any)=>part.text).join('');
 if(!text.trim())throw new Error('Gemini returned no usable plan in the completed interaction.');
 return text;
}
