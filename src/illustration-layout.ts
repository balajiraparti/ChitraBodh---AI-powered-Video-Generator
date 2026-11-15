import {isConnectorKind,isUniformKind,type Illustration} from './illustration';

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

export const rectOf=(object:Obj,x=object.x,y=object.y,scale=1):Rect=>{
 const side=Math.min(object.width,object.height),uniform=isUniformKind(object.kind);
 return {x,y,w:(uniform?side:object.width)*scale,h:(uniform?side:object.height)*scale,round:ROUND_KINDS.has(object.kind)};
};
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
 * Composition: the model often packs everything into a thin band. Stretch the arrangement (never shrink it) so the
 * objects fill the canvas, grow them a little when there is room, and carry movement destinations along.
 */
export function spreadObjects(scene:Illustration){
 const movable=scene.objects.filter(o=>!isConnectorKind(o.kind)&&!isBackdrop(o.kind)&&o.kind!=='text');
 if(movable.length<2)return;
 const finals=new Map(positions(scene,true).map(i=>[i.object.id,i]));
 const extents=movable.flatMap(o=>{const r=rectOf(o),f=finals.get(o.id);const list=[{x0:r.x-r.w/2,x1:r.x+r.w/2,y0:r.y-r.h/2,y1:r.y+r.h/2}];if(f)list.push({x0:f.x-r.w/2,x1:f.x+r.w/2,y0:f.y-r.h/2,y1:f.y+r.h/2});return list;});
 const minX=Math.min(...extents.map(e=>e.x0)),maxX=Math.max(...extents.map(e=>e.x1)),minY=Math.min(...extents.map(e=>e.y0)),maxY=Math.max(...extents.map(e=>e.y1));
 const region={x0:50,x1:850,y0:50,y1:640};
 const sx=Math.min(1.7,Math.max(1,(region.x1-region.x0)/Math.max(1,maxX-minX))),sy=Math.min(1.7,Math.max(1,(region.y1-region.y0)/Math.max(1,maxY-minY)));
 if(sx<1.05&&sy<1.05)return;
 const cx=(minX+maxX)/2,cy=(minY+maxY)/2,tx=(region.x0+region.x1)/2,ty=(region.y0+region.y1)/2;
 const map=(x:number,y:number)=>({x:tx+(x-cx)*sx,y:ty+(y-cy)*sy});
 const grow=Math.min(1.3,Math.sqrt(sx*sy));
 for(const o of movable){const p=map(o.x,o.y);o.x=p.x;o.y=p.y;if(grow>1.05){o.width=Math.min(300,Math.round(o.width*grow));o.height=Math.min(300,Math.round(o.height*grow));}}
 for(const a of scene.actions){
  if(a.action!=='move'||a.toX===undefined||a.toY===undefined)continue;
  if(!movable.some(o=>o.id===a.targetId))continue;
  const p=map(a.toX,a.toY);a.toX=Math.round(Math.min(870,Math.max(30,p.x)));a.toY=Math.round(Math.min(690,Math.max(50,p.y)));
 }
}

/**
 * A connector may not run through a third object: push that object sideways, away from the line, until the line is clear.
 */
export function clearConnectorLines(scene:Illustration){
 const items=positions(scene,false);
 for(let round=0;round<12;round++){
  let moved=false;
  for(const connector of scene.objects.filter(o=>isConnectorKind(o.kind)&&o.fromId&&o.toId)){
   const seg=segmentIn(items,connector);const dx=seg.x2-seg.x1,dy=seg.y2-seg.y1,length=Math.hypot(dx,dy);if(length<1)continue;
   for(const other of scene.objects){
    if(other.id===connector.fromId||other.id===connector.toId||isConnectorKind(other.kind)||isBackdrop(other.kind)||other.kind==='text')continue;
    if(scene.actions.some(a=>a.targetId===other.id&&a.action==='move'))continue;
    const r=rectOf(other);if(!crosses(r,seg,16))continue;
    const nx=-dy/length,ny=dx/length,side=((other.x-seg.x1)*nx+(other.y-seg.y1)*ny)>=0?1:-1;
    const reach=Math.abs(nx)*r.w/2+Math.abs(ny)*r.h/2+34;
    const distance=Math.abs((other.x-seg.x1)*nx+(other.y-seg.y1)*ny);
    const push=reach-distance+4;
    const x=Math.min(CANVAS.width-r.w/2-10,Math.max(r.w/2+10,other.x+nx*side*push)),y=Math.min(CANVAS.height-r.h/2-46,Math.max(r.h/2+8,other.y+ny*side*push));
    if(Math.hypot(x-other.x,y-other.y)<1)continue;
    other.x=Math.round(x);other.y=Math.round(y);const item=items.find(i=>i.object.id===other.id);if(item){item.x=other.x;item.y=other.y;}moved=true;
   }
  }
  if(!moved)break;
 }
}

/**
 * Pushes overlapping objects apart (along the axis with the least overlap), keeps them on the canvas with room for
 * their labels, and shrinks the largest ones a little when the picture is too crowded. Movement destinations shift
 * with their object. Deterministic and bounded; the validators still decide whether the result is acceptable.
 */
export function separateObjects(scene:Illustration){
 const movable=scene.objects.filter(o=>!isConnectorKind(o.kind)&&!isBackdrop(o.kind));
 const before=new Map(movable.map(o=>[o.id,{x:o.x,y:o.y}]));
 const pad=(o:Obj)=>({side:o.label?o.height>=o.width?20:16:6});
 const fit=(o:Obj)=>{
  const r=rectOf(o);const room=pad(o).side;
  const top=r.h/2+8,bottom=r.h/2+(o.label&&o.kind!=='text'?44:8);
  const x=Math.min(CANVAS.width-r.w/2-room,Math.max(r.w/2+room,o.x)),y=Math.min(CANVAS.height-bottom,Math.max(top,o.y));
  return {x,y};
 };
 for(let round=0;round<60;round++){
  let moved=false;
  for(let i=0;i<movable.length;i++)for(let j=i+1;j<movable.length;j++){
   const a=movable[i],b=movable[j],ra=rectOf(a),rb=rectOf(b);
   const labelA=a.label&&a.kind!=='text'?40:0,labelB=b.label&&b.kind!=='text'?40:0;
   const overlapX=(ra.w+rb.w)/2+OBJECT_CLEARANCE+10-Math.abs(a.x-b.x);
   const overlapY=(ra.h+rb.h)/2+OBJECT_CLEARANCE+10+(a.y<=b.y?labelA:labelB)-Math.abs(a.y-b.y);
   if(overlapX<=0||overlapY<=0)continue;
   moved=true;
   const useX=overlapX<overlapY;
   const amount=(useX?overlapX:overlapY)/2+1;
   if(useX){const s=a.x<=b.x?-1:1;a.x+=s*amount;b.x-=s*amount;}else{const s=a.y<=b.y?-1:1;a.y+=s*amount;b.y-=s*amount;}
  }
  for(const o of movable){const p=fit(o);if(Math.abs(p.x-o.x)>.01||Math.abs(p.y-o.y)>.01){o.x=p.x;o.y=p.y;moved=true;}}
  if(!moved)break;
  // Still crowded after many passes: make the biggest object a little smaller and try again.
  if(round>0&&round%15===0){const biggest=[...movable].sort((p,q)=>Math.max(q.width,q.height)-Math.max(p.width,p.height))[0];if(biggest&&Math.min(biggest.width,biggest.height)>110){biggest.width=Math.round(biggest.width*.9);biggest.height=Math.round(biggest.height*.9);}}
 }
 for(const o of scene.objects){o.x=Math.round(o.x);o.y=Math.round(o.y);}
 // A moving object keeps its journey: its destination shifts by the same amount as its starting point.
 for(const action of scene.actions){
  if(action.action!=='move'||action.toX===undefined||action.toY===undefined)continue;
  const o=movable.find(m=>m.id===action.targetId),start=o&&before.get(o.id);if(!o||!start)continue;
  const r=rectOf(o);
  action.toX=Math.round(Math.min(CANVAS.width-r.w/2-6,Math.max(r.w/2+6,action.toX+(o.x-start.x))));
  action.toY=Math.round(Math.min(CANVAS.height-r.h/2-44,Math.max(r.h/2+8,action.toY+(o.y-start.y))));
  if(action.toX===o.x&&action.toY===o.y)action.toX=Math.min(CANVAS.width-r.w/2-6,o.x+60);
 }
}

/**
 * Deterministic fixes applied before asking the model again (mutates the scene):
 * a move that would end on top of another object is shortened along its own path until it has clear space,
 * and connector labels that cannot be placed are dropped because they are optional.
 */
export function repairLayout(scene:Illustration){
 spreadObjects(scene);
 separateObjects(scene);
 clearConnectorLines(scene);
 separateObjects(scene);
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

const ENTER=new Set(['reveal','pop','slide_up','draw']);
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
  if(maxX-minX<560&&maxY-minY<300)errors.push('The objects form a thin horizontal band; use a second row or place some objects higher or lower so the picture fills the canvas.');
 }
 const minimumActions=Math.min(12,Math.max(3,Math.round(wordCount(narration)/10)));
 if(scene.actions.length<minimumActions)errors.push(`This ${wordCount(narration)}-word scene needs at least ${minimumActions} actions spread across its narration (it has ${scene.actions.length}); every sentence should trigger a visual change.`);
 // Speech sync: where in the narration (in words) each visual change lands.
 const wordIndex=(phrase:string,occurrence:number)=>{let at=-1;for(let i=0;i<occurrence;i++){at=narration.indexOf(phrase,at+1);if(at<0)return undefined;}return wordCount(narration.slice(0,at));};
 const marks=scene.actions.filter(a=>a.action!=='fade_out').map(a=>wordIndex(a.phrase,a.occurrence)).filter((n):n is number=>n!==undefined).sort((a,b)=>a-b);
 const total=wordCount(narration);
 if(marks.length){
  if(marks[0]>12)errors.push(`The first action fires at word ${marks[0]+1}; use a phrase from the first twelve words so the picture reacts straight away.`);
  let widest=0;for(let i=1;i<marks.length;i++)widest=Math.max(widest,marks[i]-marks[i-1]);widest=Math.max(widest,total-marks[marks.length-1]);
  if(widest>20)errors.push(`There is a stretch of ${widest} spoken words with no visual change; spread the actions so something changes at least every 20 words.`);
 }
 const hiddenAtStart=new Set(scene.actions.filter(a=>ENTER.has(a.action)).map(a=>a.targetId));
 const shown=scene.objects.filter(o=>!isConnectorKind(o.kind)&&!isBackdrop(o.kind)&&!hiddenAtStart.has(o.id));
 if(shown.length<2)errors.push('At least two objects must be visible from the start of the scene (give them no pop, slide_up, reveal or draw action) so the scene never starts empty.');
 if(errors.length)throw new Error(errors.slice(0,5).join(' '));
}
