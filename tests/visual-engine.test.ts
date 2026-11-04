import test from 'node:test';
import assert from 'node:assert/strict';
import {validateIllustration,objectPose,type Illustration,type IllustrationAction} from '../src/illustration';
import {connectorSegment,layoutLabels,repairLayout,validateIllustrationQuality} from '../src/illustration-layout';
import {repairArrayStories,validateArrayStories,type ArrayEvent,type ArrayStory} from '../src/array-story';

const narration='Next, roots pull water up from the soil through tiny tubes in the stem. At the same time, microscopic pores in the leaves take in carbon dioxide from the surrounding air.';
// Scene 2 exactly as Gemini produced it in the 3 November 2026 live run (video 4b325699).
const overlappingScene=():Illustration=>({background:'sky',objects:[
 {id:'obj_soil',kind:'soil',x:500,y:600,width:500,height:150,label:'Soil',color:'brown'},
 {id:'obj_water',kind:'water',x:500,y:500,width:120,height:80,label:'Water',color:'blue'},
 {id:'obj_leaf_two',kind:'leaf',x:500,y:250,width:200,height:150,label:'Plant Leaves',color:'green'},
 {id:'obj_arrow_water',kind:'arrow',x:500,y:420,width:40,height:40,label:'Upward Flow',color:'blue',toId:'obj_leaf_two'}
],actions:[
 {targetId:'obj_water',action:'move',phrase:'Next, roots pull water up',occurrence:1,duration:3.5,repeat:false,toX:500,toY:350},
 {targetId:'obj_arrow_water',action:'flow',phrase:'through tiny tubes',occurrence:1,duration:3,repeat:false}
]});
const fixedScene=():Illustration=>({background:'sky',objects:[
 {id:'leaf',kind:'leaf',x:450,y:160,width:200,height:140,label:'Leaf',color:'green'},
 {id:'water',kind:'drop',x:200,y:420,width:90,height:100,label:'Water',color:'blue'},
 {id:'co2',kind:'co2',x:720,y:420,width:160,height:80,label:'CO2',color:'gray'},
 {id:'up',kind:'arrow',x:325,y:290,width:30,height:30,label:'Up',color:'blue',fromId:'water',toId:'leaf',style:'solid'},
 {id:'in',kind:'arrow',x:585,y:290,width:30,height:30,label:'',color:'red',fromId:'co2',toId:'leaf',style:'dotted'}
],actions:[
 {targetId:'water',action:'move',phrase:'roots pull water up',occurrence:1,duration:3,repeat:false,toX:250,toY:300},
 {targetId:'up',action:'flow',phrase:'through tiny tubes',occurrence:1,duration:3,repeat:false},
 {targetId:'co2',action:'pop',phrase:'microscopic pores',occurrence:1,duration:.6,repeat:false},
 {targetId:'in',action:'draw',phrase:'take in carbon dioxide',occurrence:1,duration:1,repeat:false},
 {targetId:'in',action:'flow',phrase:'from the surrounding air',occurrence:1,duration:3,repeat:false}
]});
const fixedNarration='Next, roots pull water up from the soil through tiny tubes in the stem. At the same time, microscopic pores in the leaves take in carbon dioxide from the surrounding air.';

test('regression: the overlapping scene from the live run is rejected, with an actionable message',()=>{
 validateIllustration(overlappingScene());
 assert.throws(()=>validateIllustrationQuality(overlappingScene(),narration),/overlap or are closer than 40px after movement/);
});
test('a redesigned scene with clear spacing, edge-attached connectors and enough actions passes',()=>{
 validateIllustration(fixedScene());
 assert.doesNotThrow(()=>validateIllustrationQuality(fixedScene(),fixedNarration));
});
test('quality rules reject white-on-light shapes, tiny compositions, too few actions and unattached connectors',()=>{
 const white=fixedScene();white.objects[1].color='white';assert.throws(()=>validateIllustrationQuality(white,fixedNarration),/white/);
 const small=fixedScene();small.objects[0]={...small.objects[0],x:450,width:100,height:70};small.objects[2]={...small.objects[2],x:560,width:100,height:50};small.objects[1]={...small.objects[1],x:350,y:200};small.actions[0]={...small.actions[0],toX:350,toY:260};
 assert.throws(()=>validateIllustrationQuality(small,fixedNarration),/too small|overlap|closer/);
 const sparse=fixedScene();sparse.actions=sparse.actions.slice(0,2);assert.throws(()=>validateIllustrationQuality(sparse,fixedNarration),/needs at least 3 actions/);
 const legacy=fixedScene();delete legacy.objects[3].fromId;assert.throws(()=>validateIllustrationQuality(legacy,fixedNarration),/needs fromId/);
});
test('an object moving straight through another object is rejected',()=>{
 const scene=fixedScene();scene.actions[0]={...scene.actions[0],toX:450,toY:160};
 assert.throws(()=>validateIllustrationQuality(scene,fixedNarration),/through|overlap|closer/);
});
test('repair pulls a move that would land on its target back to clear space, and drops unplaceable connector labels',()=>{
 const scene=fixedScene();scene.actions[0]={...scene.actions[0],toX:450,toY:230};
 assert.throws(()=>validateIllustrationQuality(scene,fixedNarration));
 repairLayout(scene);
 assert.ok(scene.actions[0].toX!<450||scene.actions[0].toY!>230,'destination moved back along its path');
 assert.doesNotThrow(()=>validateIllustrationQuality(scene,fixedNarration));
 const crowded=fixedScene();crowded.objects[3].label='A very long connector label';
 repairLayout(crowded);assert.equal(crowded.objects[3].label,'');
});
test('connectors start and end on object edges, not inside objects or in empty space',()=>{
 const sun={x:150,y:150,w:100,h:100,round:true},leaf={x:500,y:400,w:200,h:150,round:false};
 const s=connectorSegment(sun,leaf);
 assert.ok(Math.hypot(s.x1-150,s.y1-150)>=57.9,'starts outside the circle');
 assert.ok(!(s.x2>=400&&s.x2<=600&&s.y2>=325&&s.y2<=475),'ends outside the target box');
 const legacy=connectorSegment({x:300,y:250},leaf);assert.equal(legacy.x1,300);
});
test('label placement moves a label to a free side instead of overlapping a neighbor',()=>{
 const scene={background:'paper',objects:[
  {id:'a',kind:'box',x:300,y:300,width:100,height:100,label:'Alpha',color:'teal'},
  {id:'b',kind:'box',x:300,y:420,width:100,height:100,label:'Beta',color:'blue'},
  {id:'c',kind:'box',x:700,y:300,width:100,height:100,label:'Gamma',color:'green'}
 ],actions:[]} as Illustration;
 const layout=layoutLabels(scene);
 assert.equal(layout.sides.get('a'),'above');
 assert.equal(layout.sides.get('c'),'below');
});
const event=(action:ArrayEvent['action'],low:number,high:number,mid:number):ArrayEvent=>({action,low,high,mid,phrase:action,occurrence:1});
const search=():ArrayStory=>({values:[2,4,6,8,10,12,14],target:10,events:[event('show',0,6,-1),event('compare',0,6,3),event('discard_left',0,6,3),event('compare',4,6,5),event('discard_right',4,6,5),event('compare',4,4,4),event('found',4,4,4)]});
test('binary search bookkeeping is computed by code, but wrong decisions are still rejected',()=>{
 const sloppy=search();sloppy.events[1].mid=2;sloppy.events[3].low=3;sloppy.events[4].high=9;sloppy.events[5].mid=0;
 assert.throws(()=>validateArrayStories([sloppy]));
 repairArrayStories([sloppy]);
 assert.doesNotThrow(()=>validateArrayStories([sloppy]));
 const wrong=search();wrong.events[2].action='discard_right';
 repairArrayStories([wrong]);assert.throws(()=>validateArrayStories([wrong]),/elimination: values\[3\]=8 is not greater than target 10/);
});
const act=(action:IllustrationAction['action'],at:number,extra:Partial<IllustrationAction>={}):IllustrationAction=>({targetId:'t',action,phrase:'p',occurrence:1,duration:1,repeat:false,at,...extra});
const object={id:'t',kind:'circle' as const,x:100,y:100,width:100,height:100,label:'',color:'teal' as const};
test('new enter effects hide an object until their cue, then pop or slide in',()=>{
 assert.equal(objectPose(object,[act('pop',5)],4).opacity,0);
 const popped=objectPose(object,[act('pop',5)],6);assert.equal(popped.opacity,1);assert.ok(Math.abs(popped.scale-1)<.01);
 const sliding=objectPose(object,[act('slide_up',5)],5.2);assert.ok(sliding.y>100&&sliding.opacity>0&&sliding.opacity<1);
 assert.equal(objectPose(object,[act('slide_up',5)],7).y,100);
 assert.equal(objectPose(object,[act('draw',5)],4).draw,0);assert.equal(objectPose(object,[act('draw',5)],7).draw,1);
 assert.equal(objectPose(object,[act('fade_out',5)],7).opacity,0);
 assert.ok(objectPose(object,[act('ring',5,{duration:2})],6).ring>0);
});
test('objects without their own appearance action pop in at the scene start, staggered by introAt',()=>{
 assert.equal(objectPose(object,[],1,2).opacity,0);
 assert.equal(objectPose(object,[],3,2).opacity,1);
 assert.equal(objectPose(object,[act('pop',9)],1,2).opacity,0,'an explicit enter action replaces the automatic intro');
});
