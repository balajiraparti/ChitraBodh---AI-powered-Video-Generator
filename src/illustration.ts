import {z} from 'zod';
export const SHAPES=['sun','moon','hill','water','cloud','tree','animal','person','factory','soil','atom','leaf','box','circle','arrow','text','rect','triangle','diamond','line','drop','roots','co2','o2','h2o','laptop','phone','server','bottle','truck'] as const;
export const COLORS=['teal','blue','green','gold','brown','gray','white','red','orange','purple','ink'] as const;
export const ACTIONS=['reveal','move','pulse','rotate','flow','pop','slide_up','draw','ring','fade_out'] as const;
// Actions that make an object appear; before they fire, the object is hidden.
export const ENTER_ACTIONS:readonly string[]=['reveal','pop','slide_up','draw'];
export const isConnectorKind=(kind:string)=>kind==='arrow'||kind==='line';
const id=z.string().regex(/^[a-z][a-z0-9_]{0,39}$/);
export const IllustrationSchema=z.object({
 background:z.enum(['sky','night','paper']),
 objects:z.array(z.object({id,kind:z.enum(SHAPES),x:z.number().min(30).max(870),y:z.number().min(50).max(690),width:z.number().min(30).max(840),height:z.number().min(30).max(600),label:z.string().max(30),color:z.enum(COLORS),toId:z.string().optional(),fromId:z.string().optional(),style:z.enum(['solid','dashed','dotted']).optional()})).min(3).max(16),
 actions:z.array(z.object({targetId:id,action:z.enum(ACTIONS),phrase:z.string().min(1).max(140),occurrence:z.number().int().min(1),duration:z.number().min(.5).max(12),repeat:z.boolean(),toX:z.number().min(30).max(870).optional(),toY:z.number().min(50).max(690).optional()})).min(1).max(12)
});
export type Illustration=z.infer<typeof IllustrationSchema>;
export type IllustrationAction=Illustration['actions'][number]&{at:number};
export function validateIllustration(scene:Illustration){
 const ids=new Set(scene.objects.map(o=>o.id));if(ids.size!==scene.objects.length)throw new Error('Illustration object IDs must be unique.');
 const connectors=new Set(scene.objects.filter(o=>isConnectorKind(o.kind)).map(o=>o.id));
 for(const object of scene.objects){
  const connector=isConnectorKind(object.kind);
  // Connectors attached with fromId are positioned from their objects, so their own box is irrelevant.
  if(!(connector&&object.fromId)&&(object.x-object.width/2<0||object.x+object.width/2>900||object.y-object.height/2<0||object.y+object.height/2>740))throw new Error(`Illustration object ${object.id} extends outside the 900 by 740 canvas.`);
  if(connector){
   if(!object.toId||!ids.has(object.toId)||object.toId===object.id)throw new Error('Connector needs a valid destination object toId.');
   if(connectors.has(object.toId))throw new Error('Connector destination must be an object, not another connector.');
   if(object.kind==='line'&&!object.fromId)throw new Error('A line needs fromId and toId.');
   if(object.fromId!==undefined&&(!ids.has(object.fromId)||object.fromId===object.id||object.fromId===object.toId||connectors.has(object.fromId)))throw new Error('Connector fromId must reference a different, existing object.');
  }
 }
 if(!scene.actions.some(a=>a.action==='move'||a.action==='flow'||a.action==='draw'))throw new Error('A scene needs meaningful movement, directed flow or a drawn connector, not only reveal/pulse.');
 for(const action of scene.actions){
  const object=scene.objects.find(o=>o.id===action.targetId);if(!object)throw new Error('Animation references an unknown object.');
  if((action.action==='flow'||action.action==='draw')&&!isConnectorKind(object.kind))throw new Error(`${action.action==='flow'?'Flow':'Draw'} must target an arrow or line.`);
  if(action.action==='move'){
   if(isConnectorKind(object.kind))throw new Error('Connectors follow their objects and cannot move.');
   if(action.toX===undefined||action.toY===undefined)throw new Error('Move needs toX and toY.');
   if(action.toX===object.x&&action.toY===object.y)throw new Error('Move must change position.');
   if(action.toX-object.width/2<0||action.toX+object.width/2>900||action.toY-object.height/2<0||action.toY+object.height/2>740)throw new Error('Move leaves the illustration canvas.');
  }
 }
}
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
const easeOut=(p:number)=>1-Math.pow(1-p,3);
const backOut=(p:number)=>1+2.70158*Math.pow(p-1,3)+1.70158*Math.pow(p-1,2);
/**
 * Pose of one object at a moment in time. `introAt` makes objects without an
 * explicit appearance action pop in at that time instead of being visible from frame zero.
 */
export function objectPose(object:Illustration['objects'][number],actions:IllustrationAction[],time:number,introAt?:number){
 let x=object.x,y=object.y,opacity=1,scale=1,rotation=0,offsetY=0,draw=1,ring=-1;
 const mine=actions.filter(a=>a.targetId===object.id);
 if(introAt!==undefined&&!mine.some(a=>ENTER_ACTIONS.includes(a.action))){const p=clamp((time-introAt)/.45);opacity=p;scale=Math.max(.01,.85+.15*backOut(p));}
 for(const a of mine){
  const enter=ENTER_ACTIONS.includes(a.action);
  if(time<a.at){if(enter){opacity=0;if(a.action==='draw')draw=0;}continue;}
  const elapsed=time-a.at;
  const duration=a.action==='pop'||a.action==='slide_up'?Math.min(a.duration,.8):a.duration;
  const raw=elapsed/duration,progress=a.repeat?raw%1:clamp(raw);
  if(a.action==='reveal')opacity=progress;
  if(a.action==='pop'){opacity=clamp(raw*2);scale=Math.max(.01,backOut(clamp(raw)));}
  if(a.action==='slide_up'){opacity=easeOut(clamp(raw));offsetY=(1-easeOut(clamp(raw)))*40;}
  if(a.action==='draw')draw=easeOut(clamp(raw));
  if(a.action==='fade_out')opacity=1-clamp(raw);
  if(a.action==='move'){const p=a.repeat?progress:easeOut(progress);x=object.x+(a.toX!-object.x)*p;y=object.y+(a.toY!-object.y)*p;}
  if(a.action==='pulse')scale=1+.07*Math.sin(progress*Math.PI*2);
  if(a.action==='rotate')rotation=progress*360;
  if(a.action==='ring')ring=a.repeat?progress:raw<=1?raw:-1;
 }
 return {x,y:y+offsetY,opacity,scale,rotation,draw,ring};
}
