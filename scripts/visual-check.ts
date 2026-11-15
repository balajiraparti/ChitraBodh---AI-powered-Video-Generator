// Developer tool: renders stills of a hand-authored plan that uses the visual engine, with no provider calls.
// Usage: npx tsx scripts/visual-check.ts   -> PNG frames in .cache/visual-check/
import path from 'node:path';
import {mkdir,rm} from 'node:fs/promises';
import {bundle} from '@remotion/bundler';
import {renderStill,selectComposition} from '@remotion/renderer';
import {validatePlan,scriptFor,type VideoProps} from '../src/contracts';
import {validateIllustrationQuality} from '../src/illustration-layout';
import {buildTimeline} from '../src/timing';
import {browserPath} from '../src/render';

type O=Record<string,unknown>;
const obj=(id:string,kind:string,x:number,y:number,width:number,height:number,label:string,color:string,extra:O={}):O=>({id,kind,x,y,width,height,label,color,...extra});
const link=(id:string,kind:'arrow'|'line',fromId:string,toId:string,color:string,style:string,label=''):O=>obj(id,kind,450,370,30,30,label,color,{fromId,toId,style});
const act=(targetId:string,action:string,phrase:string,duration=1,repeat=false):O=>({targetId,action,phrase,occurrence:1,duration,repeat});
const scene=(id:string,heading:string,narration:string,setting:string,objects:O[],actions:O[]):O=>({id,layout:'process_diagram',heading,narration,nodes:[],edges:[],cues:[],illustration:{background:'sky',setting,objects,actions}});

const plan=validatePlan({title:'How UPI payment works',learningObjective:'See how a UPI payment travels from your phone to the shop owner bank account.',scenes:[
 scene('start','Scan and start','You are at a shop and want to pay. First, you open your payment app and scan the shop QR code. Your phone now knows exactly who you are paying.','city',[
  obj('store','store',680,200,220,220,'Shop','orange'),obj('phone','phone',200,430,170,230,'Your phone','blue'),obj('qr','qr',690,520,150,150,'Shop QR','ink'),
  link('scan','arrow','phone','qr','teal','dashed','Scan')],[
  act('store','grow','at a shop',.8),act('phone','pulse','want to pay',1.5),act('scan','draw','scan the shop QR'),act('scan','flow','QR code',2.5),act('phone','ring','Your phone now knows',1.5)]),
 scene('pin','Enter your PIN','Next, you type the amount and enter your secret PIN. The PIN proves that it is really you, and it is never shared with the shop.','digital',[
  obj('phone','phone',200,430,170,230,'Your phone','blue'),obj('coin','coin',460,190,150,150,'Amount','gold'),obj('lock','lock',690,430,170,170,'Secret PIN','teal'),obj('shield','shield',690,640,0,0,'','teal')].slice(0,3).concat([
  link('send','arrow','phone','lock','teal','solid','PIN')]),[
  act('coin','grow','type the amount',.8),act('lock','slide_up','enter your secret PIN'),act('send','draw','proves that it is really you'),act('send','flow','really you',2.5),act('lock','shake','never shared',.8),act('lock','ring','with the shop',1.5)]),
 scene('bank','Banks talk to each other','Now the UPI network carries your request to your bank. Your bank checks your balance, and approves the payment in a second.','digital',[
  obj('phone','phone',150,200,150,150,'Your phone','blue'),obj('upi','globe',450,200,170,170,'UPI network','teal'),obj('bank','bank',730,200,170,170,'Your bank','gray'),obj('check','check',450,520,160,160,'Approved','green'),
  link('a1','arrow','phone','upi','teal','solid'),link('a2','arrow','upi','bank','teal','solid'),link('a3','arrow','bank','check','green','dotted')],[
  act('a1','draw','the UPI network carries'),act('a1','flow','your request',2),act('a2','draw','to your bank'),act('a2','flow','Your bank checks',2),act('bank','ring','your balance',1.5),act('check','pop','approves the payment'),act('a3','draw','in a second')]),
 scene('done','Money arrives','Finally, the money moves from your account to the shop owner account. Both of you get a message, and your payment is done.','city',[
  obj('you','person',140,430,150,200,'You','blue'),obj('coin','coin',330,200,150,150,'Money','gold'),obj('shop','store',760,430,210,210,'Shop owner','orange'),obj('sms','envelope',450,570,140,140,'Message','teal'),
  link('pay','arrow','you','shop','gold','solid')],[
  act('coin','pop','the money moves'),{...act('coin','move','from your account',2.5),toX:530,toY:260},act('pay','draw','to the shop owner'),act('pay','flow','shop owner account',2.5),act('sms','slide_up','Both of you get a message'),act('shop','grow','payment is done',.8)])
]});
// Validate every scene exactly as the live pipeline would.
for(const s of plan.scenes)validateIllustrationQuality(s.illustration!,s.narration);
console.log('Fixture plan passes validation and visual-quality checks.');

const duration=44;
const characters=Array.from(scriptFor(plan));
const alignment={characters,character_start_times_seconds:characters.map((_,i)=>i/characters.length*duration),character_end_times_seconds:characters.map((_,i)=>(i+1)/characters.length*duration)};
const props:VideoProps={plan,timeline:buildTimeline(plan,alignment,duration),captions:true,demo:false};
const out=path.resolve('.cache/visual-check');
await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
const serveUrl=await bundle({entryPoint:path.resolve('src/video/index.tsx')});
const browserExecutable=browserPath();
const composition=await selectComposition({serveUrl,id:'Explainer',inputProps:props,browserExecutable});
for(const [index,timing] of props.timeline.scenes.entries()){
 const length=timing.end-timing.start;
 for(const [step,fraction] of [[0,.1],[1,.4],[2,.7],[3,.97]] as const){
  const frame=Math.min(composition.durationInFrames-1,Math.floor((timing.start+length*fraction)*composition.fps));
  await renderStill({serveUrl,composition,inputProps:props,browserExecutable,output:path.join(out,`scene${index+1}-${step}.png`),frame});
 }
}
console.log('Frames written to '+out);
