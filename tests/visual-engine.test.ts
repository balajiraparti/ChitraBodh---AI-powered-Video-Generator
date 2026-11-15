import test from 'node:test';
import assert from 'node:assert/strict';
import {validateIllustration,objectPose,type Illustration,type IllustrationAction} from '../src/illustration';
import {connectorSegment,layoutLabels,repairLayout,validateIllustrationQuality} from '../src/illustration-layout';
import {buildTimeline,SYNC_LEAD} from '../src/timing';
import {demoPlan,fixtureAlignment} from '../src/fixtures';
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
 const sparse=fixedScene();sparse.actions=sparse.actions.slice(0,2);assert.throws(()=>validateIllustrationQuality(sparse,fixedNarration),/needs at least [0-9]+ actions/);
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

test('pacing rules: the first action must come early, and scenes may not start empty',()=>{
 const late=fixedScene();late.actions=late.actions.map(a=>({...a,phrase:'take in carbon dioxide'}));
 assert.throws(()=>validateIllustrationQuality(late,fixedNarration),/first action fires at word/);
 const empty=fixedScene();empty.actions.push({targetId:'leaf',action:'pop',phrase:'Next',occurrence:1,duration:.6,repeat:false},{targetId:'water',action:'slide_up',phrase:'roots',occurrence:1,duration:.6,repeat:false});
 assert.throws(()=>validateIllustrationQuality(empty,fixedNarration),/at least two objects must be visible/i);
});
test('new real-world objects, shake and grow animate and stay inside their layout box',()=>{
 const kinds=['house','car','coin','check','lock','shield','bulb','gear','chart','cart','store','envelope','battery','solar_panel','wind_turbine','bell','heart','globe','clock','qr','bank','book'];
 for(const kind of kinds){const scene:Illustration={background:'sky',setting:'city',objects:[{id:'a',kind:kind as never,x:300,y:300,width:200,height:200,label:'A',color:'teal'},{id:'b',kind:'box',x:650,y:300,width:150,height:150,label:'B',color:'gold'},{id:'c',kind:'circle',x:300,y:600,width:100,height:100,label:'C',color:'blue'}],actions:[{targetId:'b',action:'move',phrase:'x',occurrence:1,duration:1,repeat:false,toX:600,toY:400}]};validateIllustration(scene);}
 assert.ok(objectPose(object,[act('grow',5)],7).scale>1.15);
 assert.notEqual(objectPose(object,[act('shake',5,{duration:1})],5.1).x,100);
 assert.equal(objectPose(object,[act('shake',5,{duration:1})],7).x,100);
});
test('speech sync: visual cues start slightly before the spoken phrase and never before their scene',()=>{
 const plan=structuredClone(demoPlan);
 plan.scenes[1].illustration={background:'sky',objects:[{id:'a',kind:'sun',x:200,y:200,width:100,height:100,label:'',color:'gold'},{id:'b',kind:'water',x:500,y:400,width:100,height:100,label:'',color:'blue'},{id:'c',kind:'arrow',x:300,y:300,width:30,height:30,label:'',color:'teal',fromId:'a',toId:'b'}],actions:[{targetId:'c',action:'flow',phrase:'liquid water',occurrence:1,duration:2,repeat:false}]};
 delete plan.scenes[1].motion;
 const timeline=buildTimeline(plan,fixtureAlignment(),75);const action=timeline.scenes[1].illustrationActions![0];
 const start=plan.scenes[1].narration.indexOf('liquid water');assert.ok(start>0);
 assert.ok(action.at>=timeline.scenes[1].start);
 const base=buildTimeline(demoPlan,fixtureAlignment(),75);assert.ok(base.scenes[1].start<action.at+SYNC_LEAD+1e-9);
 assert.ok(SYNC_LEAD>0&&SYNC_LEAD<.3);
});
test('draft repair keeps scenes from opening empty, adds missing motion and covers silent sentences without a model call',async()=>{
 const {repairIllustrationDraft}=await import('../src/providers');
 const narration='A customer opens the app. The bank checks the balance. Then the shop gets the money.';
 const draft={scenes:[{narration,illustration:{background:'sky',objects:[
  {id:'app',kind:'phone',label:'App',x:200,y:300,width:150,height:150,color:'blue'},
  {id:'bank',kind:'bank',label:'Bank',x:700,y:300,width:150,height:150,color:'gray'},
  {id:'shop',kind:'store',label:'Shop',x:450,y:600,width:150,height:150,color:'orange'},
  {id:'link',kind:'arrow',label:'',x:450,y:300,width:30,height:30,color:'teal',fromId:'app',toId:'bank'}],
  actions:[{targetId:'app',action:'pop',phrase:'opens the app',occurrence:1,duration:.6,repeat:false},{targetId:'bank',action:'slide_up',phrase:'checks',occurrence:1,duration:.6,repeat:false},{targetId:'shop',action:'flow',phrase:'the money',occurrence:1,duration:2,repeat:false}]}}]};
 repairIllustrationDraft(draft);
 const actions=draft.scenes[0].illustration.actions;
 assert.ok(!actions.some(a=>a.targetId==='shop'&&a.action==='flow'),'flow on a non-connector is replaced');
 assert.ok(actions.some(a=>a.action==='flow'&&a.targetId==='link'),'a connector flow is added');
 const hidden=new Set(actions.filter(a=>['pop','slide_up','reveal'].includes(a.action)).map(a=>a.targetId));
 assert.ok(['app','bank','shop'].filter(id=>!hidden.has(id)).length>=2,'two objects visible from the start');
 const silent={scenes:[{narration:'The customer opens the app. The bank checks the balance carefully. The shop gets paid.',illustration:{background:'sky',objects:structuredClone(draft.scenes[0].illustration.objects),actions:[{targetId:'app',action:'ring',phrase:'opens the app',occurrence:1,duration:1,repeat:false},{targetId:'link',action:'flow',phrase:'the shop',occurrence:1,duration:2,repeat:false}]}}]};
 repairIllustrationDraft(silent);
 assert.ok(silent.scenes[0].illustration.actions.some(a=>a.action==='ring'&&a.targetId==='bank'&&a.phrase.toLowerCase()==='bank'),'the sentence about the bank gets a ring on the bank, on its own word');
});
test('separateObjects untangles a crowded scene, keeps labels on canvas and carries move destinations along',()=>{
 const scene:Illustration={background:'sky',objects:[
  {id:'a',kind:'bank',x:300,y:300,width:200,height:200,label:'Bank',color:'gray'},
  {id:'b',kind:'coin',x:350,y:330,width:180,height:180,label:'Funds',color:'gold'},
  {id:'c',kind:'store',x:700,y:660,width:200,height:200,label:'Store',color:'orange'},
  {id:'d',kind:'phone',x:320,y:340,width:170,height:170,label:'Phone',color:'blue'}
 ],actions:[{targetId:'b',action:'move',phrase:'x',occurrence:1,duration:1,repeat:false,toX:600,toY:400}]};
 repairLayout(scene);
 for(const o of scene.objects){assert.ok(o.x-o.width/2>=0&&o.x+o.width/2<=900&&o.y-o.height/2>=0&&o.y+o.height/2<=700,o.id+' stays on canvas with label room');}
 assert.doesNotThrow(()=>validateIllustration(scene));
 const overlap=scene.objects.some((p,i)=>scene.objects.slice(i+1).some(q=>Math.abs(p.x-q.x)<(p.width+q.width)/2&&Math.abs(p.y-q.y)<(p.height+q.height)/2));
 assert.equal(overlap,false);
});
