import {SCRIPT_SYSTEM_INSTRUCTION,MIN_SCRIPT_WORDS,MAX_SCRIPT_WORDS} from './video-policy';
import {PlanSchema,ICONS,validatePlan,scriptFor,type Plan,type Alignment} from './contracts';
import {z} from 'zod';
import {SHAPES,COLORS} from './illustration';
import {validateIllustrationQuality,repairLayout} from './illustration-layout';
import {repairArrayStories,type ArrayStory} from './array-story';

// The model only has to decide the example and the actions; derived search bounds are computed by code.
function repairDerivedFields(candidate:unknown){
 try{
  const scenes=(candidate as {scenes?:{arrayStory?:ArrayStory}[]}).scenes;
  if(!Array.isArray(scenes)||!scenes.length||!scenes.every(s=>s?.arrayStory&&Array.isArray(s.arrayStory.values)&&Array.isArray(s.arrayStory.events)&&s.arrayStory.events.every(e=>e&&typeof e==='object')))return;
  repairArrayStories(scenes.map(s=>s.arrayStory));
 }catch{/* validation reports malformed plans */}
}
function validateVisualQuality(plan:Plan){
 for(const scene of plan.scenes){
  if(!scene.illustration)continue;
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
  const shared=`Create a beginner-friendly 60–90 second educational explainer, about 190–215 spoken words. Topic: ${JSON.stringify(topic)}. You decide the complete example, script, storyboard, positions and visual sequence. Target 190–210 spoken words TOTAL; a clear shorter script of 100–240 words is acceptable for the supported 40–90 second range. Use four or five scenes, ideally forty-five to fifty-five spoken words each. Expand with useful explanation, a worked example and a recap rather than filler. Count only narration words, not labels or JSON. Return 4–6 scenes, each with a short heading (under 45 characters), spoken narration, layout process_diagram, and empty nodes=[], edges=[], cues=[]. IDs start with a lowercase letter and contain only lowercase letters, digits and underscores. All action phrases must be exact case-sensitive substrings of their scene narration; occurrence is one-based. Choose phrases early enough to let viewers watch each action. Speak numbers and symbols as words. Keep facts accurate. No executable code or external assets. Do not use generic icons as substitutes for objects (for example a chip is not an animal).`;
  const visual=binary?`Every scene MUST have arrayStory. Independently choose 5–9 sorted, distinct integers in 0..99 and a target PRESENT in the array requiring at least three comparisons, unless absence was explicitly requested. Keep values and target identical throughout. Author all events: show, compare, discard_left, discard_right, found, not_found, with low, high, mid, phrase, occurrence. Indices start at zero. Initial low=0, high=length-1. compare mid=floor((low+high)/2). Decisions use the SAME low/high/mid as the preceding compare. If values[mid]<target: discard_left; next low=mid+1. If greater: discard_right; next high=mid-1. If equal: found. Each compare must have its own subsequent decision at a distinct later speech phrase. Show uses current bounds and mid=-1. After found only a recap show is allowed. not_found requires low>high and mid=-1. Use introduction, a scene per comparison, and recap. Explain sorted input, zero-based indices, rounding down, and each eliminated range. Do not omit arrayStory during repair.`:
  `Every scene MUST have illustration: background sky/night/paper; objects; actions. You design a coherent illustrated environment or diagram, not a grid of icon cards. Available object kinds: ${SHAPES.join(', ')}. Select relevant shapes: landscapes can use hill, sun, moon, water, tree; biology can use animal, person, leaf, roots, drop, soil; chemistry can use the molecules co2, o2, h2o and atom; technology can use laptop, phone, server; products and logistics can use bottle, truck, box, factory; diagrams can use rect, circle, triangle, diamond, arrows and lines. Do not add unrelated scenery. Reuse object positions across connected scenes. Each object has id, kind, CENTER x/y, width/height, label (short, maximum 30 characters), color (${COLORS.join('/')}). The canvas is 900 wide and 740 high. Every width and height is at least 30, including arrows and text. Centers x are 30..870 and y are 50..690. Width is at most 840 and height at most 600. All objects must stay inside it INCLUDING half-width/half-height. Keep every object at least 60 pixels away from every other object (hard minimum 40) and away from the canvas edges, including after movement; hills and soil are scenery that other objects may stand on. Every scene's objects array MUST contain 4–8 real objects (not counting connectors) PLUS its connectors, at most 16 entries in total, never fewer than 4. Make the objects LARGE: main objects should be 140–260 pixels wide, and together the objects must span at least 480 pixels horizontally or 380 vertically. Labels are placed automatically beside each object (keep them under 18 characters); leave room for them and do not use text objects as labels. Connectors are objects of kind arrow (with a head) or line (no head): set fromId (source object) and toId (destination object), choose style solid, dashed or dotted, give x/y any values in range (for example the midpoint) and width=height=30. They attach to the edges of the two objects automatically, follow them when they move, and can never be moved themselves. Connector labels are optional and short (like Yes, No, Energy) and need at least 120 pixels between the two objects. Use real objects where possible: co2, o2 and h2o are labeled molecules (set height to half the width, for example 160 by 80); a cloud must not imply carbon dioxide gas is a visible cloud. For flowcharts use rect for steps, diamond for decisions, circle for start and end, and arrows labeled Yes and No leaving diamonds. Never use white on a light background. Actions: reveal, pop, slide_up, draw, move, pulse, rotate, flow, ring, fade_out. Each has targetId, action, exact spoken phrase, occurrence, duration (0.5–12 seconds), repeat boolean. Move needs toX/toY DIFFERENT from the initial x/y; at least one coordinate must change by 40 or more pixels. Do not move an object to its existing position. Destinations must stay inside canvas. Flow MUST target an arrow or line; it sends animated particles toward toId. Draw MUST target an arrow or line and draws it on. Objects without their own reveal, pop, slide_up or draw action pop in automatically when the scene starts; give an object one of those actions only if it should appear later when the narration mentions it. pop and slide_up make a new object appear, ring highlights an object the narration is emphasizing, and fade_out removes something no longer needed. Every scene must include meaningful move or flow synchronized to its explanation, not just fades or pulse. Use at least one action per sentence and roughly one per ten spoken words (minimum three per scene, maximum twelve), spread across the whole narration so something changes every few seconds. A moved object needs a clear straight path that does not cross other objects and must end at least 40 pixels from them: place its destination beside its target, not on top of it. The one exception is something being absorbed or consumed (water or carbon dioxide entering a leaf, food entering a mouth): move it onto the target and then give it a fade_out action at a later phrase; an object with fade_out may overlap its target. Build each scene as a sequence: show the context first, then bring in new objects and connectors one by one as the narration reaches them. For cycles, show transfers between actual reservoirs. Illustrate invisible gases schematically with labels. A moon or sun is an illustration, not an arbitrary rotating planet used for every subject.`;
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
