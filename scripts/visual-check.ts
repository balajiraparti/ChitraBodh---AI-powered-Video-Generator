// Developer tool: renders stills of a hand-authored plan that uses the visual engine, with no provider calls.
// Usage: npm run visual-check   -> PNG frames in .cache/visual-check/
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
const scene=(id:string,heading:string,narration:string,objects:O[],actions:O[],background='sky'):O=>({id,layout:'process_diagram',heading,narration,nodes:[],edges:[],cues:[],illustration:{background,objects,actions}});

const plan=validatePlan({title:'How photosynthesis works',learningObjective:'See how plants turn light, water and carbon dioxide into food and oxygen.',scenes:[
 scene('sunlight','Capturing Sunlight','Photosynthesis is the process plants use to make their own food. First, leaves absorb sunlight using a special green pigment called chlorophyll. This solar energy provides the power needed to drive the entire chemical transformation forward.',[
  obj('sun','sun',170,170,150,150,'Sunlight','gold'),obj('leaf','leaf',620,450,270,190,'Leaf','green'),obj('chl','circle',230,520,120,120,'Chlorophyll','teal'),
  link('ray','arrow','sun','leaf','gold','dashed','Energy'),link('pigment','arrow','chl','leaf','teal','dotted')],[
  act('sun','pulse','First, leaves',2,true),act('ray','draw','absorb sunlight'),act('ray','flow','using a special green pigment',3),act('chl','pop','called chlorophyll'),act('pigment','draw','This solar energy'),act('leaf','ring','drive the entire chemical transformation',1.5)]),
 scene('water','Water and Minerals','Next, roots pull water up from the soil through tiny tubes in the stem. At the same time, microscopic pores in the leaves take in carbon dioxide from the surrounding air.',[
  obj('soil','soil',250,610,440,130,'Soil','brown'),obj('roots','roots',250,470,130,150,'Roots','brown'),obj('drop','drop',90,520,80,90,'Water','blue'),obj('leaf','leaf',470,150,230,155,'Leaf','green'),obj('co2','co2',730,400,180,90,'Carbon dioxide','gray'),
  link('up','arrow','roots','leaf','blue','solid','Up the stem'),link('air','arrow','co2','leaf','red','dotted')],[
  {...act('drop','move','roots pull water up',3),toX:150,toY:260},act('up','draw','from the soil'),act('up','flow','through tiny tubes',3),act('leaf','ring','microscopic pores',1.5),act('co2','pop','take in'),act('air','draw','carbon dioxide'),act('air','flow','from the surrounding air',3)]),
 scene('glucose','Creating Glucose','Inside the leaf cells, solar energy triggers a reaction. Water and carbon dioxide molecules are rearranged to form glucose, which serves as nourishing food for the growing plant.',[
  obj('sun','sun',450,120,100,100,'Light energy','gold'),obj('h2o','h2o',140,220,150,110,'Water','blue'),obj('co2','co2',140,520,170,90,'Carbon dioxide','gray'),obj('cell','rect',450,370,200,150,'Reaction','teal'),obj('sugar','circle',770,370,150,150,'Glucose','gold'),
  link('light','arrow','sun','cell','gold','dashed'),link('in1','arrow','h2o','cell','blue','solid'),link('in2','arrow','co2','cell','red','solid'),link('out','arrow','cell','sugar','teal','solid','Food')],[
  act('light','draw','solar energy'),act('light','flow','triggers a reaction',3),act('in1','flow','Water and carbon dioxide',3),act('in2','flow','molecules are rearranged',3),act('cell','pulse','rearranged to form',2),act('sugar','pop','form glucose'),act('out','draw','which serves'),act('out','flow','nourishing food',3),act('sugar','ring','growing plant',1.5)]),
 scene('oxygen','Releasing Oxygen','As a final result, the plant releases fresh oxygen back into the atmosphere for animals and humans to breathe. This vital cycle sustains nearly all life on Earth.',[
  obj('tree','tree',220,420,230,300,'Plant','green'),obj('o2','o2',640,190,170,85,'Oxygen','red'),obj('person','person',560,560,100,130,'People','teal'),obj('animal','animal',775,545,130,100,'Animals','brown'),
  link('release','arrow','tree','o2','blue','dashed','Releases'),link('toperson','arrow','o2','person','red','dotted'),link('toanimal','arrow','o2','animal','red','dotted')],[
  act('tree','ring','As a final result',1.5),act('o2','pop','releases fresh oxygen'),act('release','draw','oxygen back'),act('release','flow','back into the atmosphere',3),act('animal','pop','for animals'),act('person','pop','and humans'),act('toanimal','draw','to breathe'),act('toperson','draw','to breathe'),act('toanimal','flow','sustains nearly all life',3),act('toperson','flow','nearly all life',3)])
]});
for(const s of plan.scenes)validateIllustrationQuality(s.illustration!,s.narration);
console.log('Fixture plan passes validation and visual-quality checks.');

const duration=52;
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
 for(const [step,fraction] of [[0,.12],[1,.4],[2,.7],[3,.97]] as const){
  const frame=Math.min(composition.durationInFrames-1,Math.floor((timing.start+length*fraction)*composition.fps));
  await renderStill({serveUrl,composition,inputProps:props,browserExecutable,output:path.join(out,`scene${index+1}-${step}.png`),frame});
 }
}
console.log('Frames written to '+out);
