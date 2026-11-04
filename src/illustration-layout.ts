import {isConnectorKind,type Illustration} from './illustration';

type Obj=Illustration['objects'][number];
export type Box={x:number;y:number;w:number;h:number};
export type Rect=Box&{round:boolean};
export type Side='below'|'above'|'right'|'left';

export const CANVAS={width:900,height:740};
export const OBJECT_CLEARANCE=40;
export const LABEL_CLEARANCE=6;
const LABEL_FONT=24;
const ROUND_KINDS=new Set(['sun','moon','circle','atom','drop']);
// Large scenery that other objects may stand on or in front of.
const BACKDROP_KINDS=new Set(['hill','soil']);
export const isBackdrop=(kind:string)=>BACKDROP_KINDS.has(kind);
const LABEL_SIDES:Side[]=['below','above','right','left'];

export const rectOf=(object:Obj,x=object.x,y=object.y,scale=1):Rect=>({x,y,w:object.width*scale,h:object.height*scale,round:ROUND_KINDS.has(object.kind)});
export const labelSize=(text:string)=>({w:text.length*LABEL_FONT*.6+10,h:30});
export const labelCenter=(side:Side,rect:Box,text:string):{x:number;y:number}=>{
 const {w,h}=labelSize(text);
 if(side==='below')return {x:rect.x,y:rect.y+rect.h/2+8+h/2};
 if(side==='above')return {x:rect.x,y:rect.y-rect.h/2-8-h/2};
 if(side==='right')return {x:rect.x+rect.w/2+8+w/2,y:rect.y};
 return {x:rect.x-rect.w/2-8-w/2,y:rect.y};
};
const labelBox=(side:Side,rect:Box,text:string):Box=>({...labelCenter(side,rect,text),...labelSize(text)});
const overlaps=(a:Box,b:Box,gap:number)=>Math.abs(a.x-b.x)<(a.w+b.w)/2+gap&&Math.abs(a.y-b.y)<(a.h+b.h)/2+gap;
const insideCanvas=(b:Box,margin=4)=>b.x-b.w/2>=margin&&b.x+b.w/2<=CANVAS.width-margin&&b.y-b.h/2>=margin&&b.y+b.h/2<=CANVAS.height-margin;

// Point on the object's outline, seen from its center toward (tx,ty), pushed out by `gap`.
export function edgePoint(rect:Rect,tx:number,ty:number,gap:number){
 const dx=tx-rect.x,dy=ty-rect.y,distance=Math.hypot(dx,dy);
 if(distance<1e-6)return {x:rect.x,y:rect.y};
 const ux=dx/distance,uy=dy/distance,a=rect.w/2,b=rect.h/2;
 const reach=rect.round?1/Math.sqrt((ux/a)**2+(uy/b)**2):Math.min(Math.abs(ux)>1e-9?a/Math.abs(ux):Infinity,Math.abs(uy)>1e-9?b/Math.abs(uy):Infinity);
 return {x:rect.x+ux*(reach+gap),y:rect.y+uy*(reach+gap)};
}
export type Segment={x1:number;y1:number;x2:number;y2:number};
/** Connector line between two objects, starting and ending just outside their outlines. A start point without a rect is legacy. */
export function connectorSegment(from:Rect|{x:number;y:number},to:Rect):Segment{
 const start='w' in from?edgePoint(from,to.x,to.y,8):from;
 const end=edgePoint(to,start.x,start.y,10);
 return {x1:start.x,y1:start.y,x2:end.x,y2:end.y};
}
const pointAt=(s:Segment,t:number)=>({x:s.x1+(s.x2-s.x1)*t,y:s.y1+(s.y2-s.y1)*t});

type Item={object:Obj;x:number;y:number};
function positions(scene:Illustration,final:boolean):Item[]{
 return scene.objects.filter(o=>!final||!scene.actions.some(a=>a.targetId===o.id&&a.action==='fade_out')).map(object=>{
  const move=final?[...scene.actions].reverse().find(a=>a.targetId===object.id&&a.action==='move'):undefined;
  return {object,x:move?.toX??object.x,y:move?.toY??object.y};
 });
}
const solid=(items:Item[])=>items.filter(i=>!isConnectorKind(i.object.kind)&&!isBackdrop(i.object.kind));
function segmentIn(items:Item[],connector:Obj):Segment{
 const to=items.find(i=>i.object.id===connector.toId);const from=connector.fromId?items.find(i=>i.object.id===connector.fromId):undefined;
 const toRect=to?rectOf(to.object,to.x,to.y):rectOf(connector);
 return connectorSegment(from?rectOf(from.object,from.x,from.y):{x:connector.x,y:connector.y},toRect);
}

// True when any part of the connector line passes through the box (sampled every few pixels).
function crosses(box:Box,s:Segment,margin:number){
 const length=Math.hypot(s.x2-s.x1,s.y2-s.y1),steps=Math.max(1,Math.ceil(length/6));
 for(let i=0;i<=steps;i++){const p=pointAt(s,i/steps);if(Math.abs(p.x-box.x)<box.w/2+margin&&Math.abs(p.y-box.y)<box.h/2+margin)return true;}
 return false;
}

export type LabelLayout={sides:Map<string,Side>;connectorT:Map<string,number>;problems:string[];unplacedConnectors:string[]};
/** Deterministic label placement shared by the validator and the renderer. Never throws. */
export function layoutLabels(scene:Illustration):LabelLayout{
 const states=[positions(scene,false),positions(scene,true)];
 const placed:Box[][]=states.map(()=>[]);
 const sides=new Map<string,Side>(),connectorT=new Map<string,number>(),problems:string[]=[],unplacedConnectors:string[]=[];
 for(const object of scene.objects){
  if(isConnectorKind(object.kind)||object.kind==='text'||!object.label)continue;
  let chosen:Side|undefined;
  // First choice avoids scenery too (a label on top of soil or a hill is legible but cramped); then accept scenery.
  for(const avoidScenery of [true,false]){
   for(const side of LABEL_SIDES){
    const fits=states.every((items,index)=>{
     const me=items.find(i=>i.object.id===object.id);if(!me)return true;
     const box=labelBox(side,rectOf(object,me.x,me.y),object.label);
     const obstacles=avoidScenery&&!isBackdrop(object.kind)?items.filter(i=>!isConnectorKind(i.object.kind)):solid(items);
     const lines=items.filter(i=>isConnectorKind(i.object.kind)).map(i=>segmentIn(items,i.object));
     return insideCanvas(box)&&!obstacles.some(i=>i.object.id!==object.id&&overlaps(box,rectOf(i.object,i.x,i.y),LABEL_CLEARANCE))&&!lines.some(s=>crosses(box,s,3))&&!placed[index].some(p=>overlaps(box,p,LABEL_CLEARANCE));
    });
    if(fits){chosen=side;break;}
   }
   if(chosen)break;
  }
  if(!chosen){problems.push(`The label "${object.label}" of ${object.id} has no free space on any side; give it more room or shorten the label.`);chosen='below';}
  sides.set(object.id,chosen);
  states.forEach((items,index)=>{const me=items.find(i=>i.object.id===object.id);if(me)placed[index].push(labelBox(chosen!,rectOf(object,me.x,me.y),object.label));});
 }
 for(const connector of scene.objects.filter(o=>isConnectorKind(o.kind)&&o.label)){
  let chosen:number|undefined;
  for(const t of [.5,.35,.65,.25,.75]){
   const fits=states.every((items,index)=>{
    const size=labelSize(connector.label),center=pointAt(segmentIn(items,connector),t),box={...center,...size};
    return insideCanvas(box)&&!solid(items).some(i=>overlaps(box,rectOf(i.object,i.x,i.y),4))&&!placed[index].some(p=>overlaps(box,p,4));
   });
   if(fits){chosen=t;break;}
  }
  if(chosen===undefined){problems.push(`The connector label "${connector.label}" (${connector.id}) collides with other objects; lengthen the connector, move the objects apart, or shorten the label.`);unplacedConnectors.push(connector.id);chosen=.5;}
  connectorT.set(connector.id,chosen);
  states.forEach((items,index)=>placed[index].push({...pointAt(segmentIn(items,connector),chosen!),...labelSize(connector.label)}));
 }
 return {sides,connectorT,problems,unplacedConnectors};
}

/**
 * Deterministic fixes applied before asking the model again (mutates the scene):
 * a move that would end on top of another object is shortened along its own path until it has clear space,
 * and connector labels that cannot be placed are dropped because they are optional.
 */
export function repairLayout(scene:Illustration){
 const final=positions(scene,true);
 for(const action of scene.actions){
  if(action.action!=='move'||action.toX===undefined||action.toY===undefined)continue;
  const mover=scene.objects.find(o=>o.id===action.targetId);if(!mover)continue;
  if(scene.actions.some(a=>a.targetId===mover.id&&a.action==='fade_out'))continue;
  const others=solid(final).filter(i=>i.object.id!==mover.id);
  for(let step=20;step>=4;step--){
   const t=step/20,x=mover.x+(action.toX-mover.x)*t,y=mover.y+(action.toY-mover.y)*t;
   if(others.some(i=>overlaps(rectOf(mover,x,y),rectOf(i.object,i.x,i.y),OBJECT_CLEARANCE+20)))continue;
   if(step<20&&Math.hypot(x-mover.x,y-mover.y)>=40){action.toX=Math.round(x);action.toY=Math.round(y);}
   break;
  }
 }
 const dropped=new Set(layoutLabels(scene).unplacedConnectors);
 for(const object of scene.objects)if(dropped.has(object.id))object.label='';
}

const wordCount=(text:string)=>text.trim().split(/\s+/).filter(Boolean).length;
/** Stricter rules for newly generated plans. Legacy saved plans do not need to pass these. */
export function validateIllustrationQuality(scene:Illustration,narration:string){
 const errors:string[]=[];
 const named=(o:Obj)=>`${o.id} (${o.kind}${o.label?` "${o.label}"`:''})`;
 for(const o of scene.objects)if(isConnectorKind(o.kind)&&!o.fromId)errors.push(`Connector ${o.id} needs fromId (the source object) as well as toId.`);
 for(const o of scene.objects)if(o.color==='white'&&o.kind!=='text'&&!isConnectorKind(o.kind)&&scene.background!=='night')errors.push(`${named(o)} is white on a light background and is hard to see; use another color.`);
 const states=[{name:'at the start',items:positions(scene,false)},{name:'after movement',items:positions(scene,true)}];
 for(const state of states){
  const items=solid(state.items);
  for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++){
   const a=rectOf(items[i].object,items[i].x,items[i].y),b=rectOf(items[j].object,items[j].x,items[j].y);
   if(overlaps(a,b,OBJECT_CLEARANCE))errors.push(`${named(items[i].object)} and ${named(items[j].object)} overlap or are closer than ${OBJECT_CLEARANCE}px ${state.name}. Move them apart (centers at least ${Math.ceil((a.w+b.w)/2+OBJECT_CLEARANCE)} px apart horizontally or ${Math.ceil((a.h+b.h)/2+OBJECT_CLEARANCE)} px vertically).`);
  }
 }
 for(const action of scene.actions){
  if(action.action!=='move')continue;
  const mover=scene.objects.find(o=>o.id===action.targetId)!;
  // Something absorbed by its target (moves onto it, then fades out) may pass through and overlap it.
  if(scene.actions.some(a=>a.targetId===mover.id&&a.action==='fade_out'))continue;
  const others=solid(positions(scene,false)).filter(i=>i.object.id!==mover.id&&!scene.actions.some(a=>a.targetId===i.object.id&&a.action==='move'));
  for(let step=1;step<=12;step++){
   const t=step/12,x=mover.x+(action.toX!-mover.x)*t,y=mover.y+(action.toY!-mover.y)*t;
   const hit=others.find(i=>overlaps(rectOf(mover,x,y),rectOf(i.object,i.x,i.y),0));
   if(hit){errors.push(`${named(mover)} moves straight through ${named(hit.object)}; choose a path or destination that avoids it.`);break;}
  }
 }
 errors.push(...layoutLabels(scene).problems);
 for(const connector of scene.objects.filter(o=>isConnectorKind(o.kind)&&o.fromId)){
  for(const state of states){const s=segmentIn(state.items,connector);if(Math.hypot(s.x2-s.x1,s.y2-s.y1)<40){errors.push(`Connector ${connector.id} is shorter than 40px ${state.name}; place its objects farther apart.`);break;}}
 }
 const visible=solid(positions(scene,false)).filter(i=>i.object.kind!=='text');
 if(visible.length){
  const minX=Math.min(...visible.map(i=>i.x-i.object.width/2)),maxX=Math.max(...visible.map(i=>i.x+i.object.width/2));
  const minY=Math.min(...visible.map(i=>i.y-i.object.height/2)),maxY=Math.max(...visible.map(i=>i.y+i.object.height/2));
  if(maxX-minX<480&&maxY-minY<380)errors.push('The illustration is too small for the canvas; use larger objects and spread them across at least 480 px horizontally or 380 px vertically.');
 }
 const minimumActions=Math.min(12,Math.max(3,Math.round(wordCount(narration)/10)));
 if(scene.actions.length<minimumActions)errors.push(`This ${wordCount(narration)}-word scene needs at least ${minimumActions} actions spread across its narration (it has ${scene.actions.length}); every sentence should trigger a visual change.`);
 if(errors.length)throw new Error(errors.slice(0,5).join(' '));
}
