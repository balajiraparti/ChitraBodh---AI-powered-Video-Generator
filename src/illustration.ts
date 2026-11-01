import {z} from 'zod';
export const SHAPES=['sun','moon','hill','water','cloud','tree','animal','person','factory','soil','atom','leaf','box','circle','arrow','text'] as const;
const id=z.string().regex(/^[a-z][a-z0-9_]{0,39}$/);
export const IllustrationSchema=z.object({
 background:z.enum(['sky','night','paper']),
 objects:z.array(z.object({id,kind:z.enum(SHAPES),x:z.number().min(30).max(870),y:z.number().min(50).max(690),width:z.number().min(30).max(840),height:z.number().min(30).max(600),label:z.string().max(30),color:z.enum(['teal','blue','green','gold','brown','gray','white']),toId:z.string().optional()})).min(3).max(16),
 actions:z.array(z.object({targetId:id,action:z.enum(['reveal','move','pulse','rotate','flow']),phrase:z.string().min(1).max(140),occurrence:z.number().int().min(1),duration:z.number().min(.5).max(12),repeat:z.boolean(),toX:z.number().min(30).max(870).optional(),toY:z.number().min(50).max(690).optional()})).min(1).max(12)
});
export type Illustration=z.infer<typeof IllustrationSchema>;
export type IllustrationAction=Illustration['actions'][number]&{at:number};
export function validateIllustration(scene:Illustration){
 const ids=new Set(scene.objects.map(o=>o.id));if(ids.size!==scene.objects.length)throw new Error('Illustration object IDs must be unique.');
 for(const object of scene.objects){
  if(object.x-object.width/2<0||object.x+object.width/2>900||object.y-object.height/2<0||object.y+object.height/2>740)throw new Error(`Illustration object ${object.id} extends outside the 900 by 740 canvas.`);
  if(object.kind==='arrow'&&(!object.toId||!ids.has(object.toId)||object.toId===object.id))throw new Error('Arrow needs a valid destination object toId.');
 }
 if(!scene.actions.some(a=>a.action==='move'||a.action==='flow'))throw new Error('A scene needs meaningful movement or directed flow, not only reveal/pulse.');
 for(const action of scene.actions){
  const object=scene.objects.find(o=>o.id===action.targetId);if(!object)throw new Error('Animation references an unknown object.');
  if(action.action==='flow'&&object.kind!=='arrow')throw new Error('Flow must target an arrow.');
  if(action.action==='move'){
   if(action.toX===undefined||action.toY===undefined)throw new Error('Move needs toX and toY.');
   if(action.toX===object.x&&action.toY===object.y)throw new Error('Move must change position.');
   if(action.toX-object.width/2<0||action.toX+object.width/2>900||action.toY-object.height/2<0||action.toY+object.height/2>740)throw new Error('Move leaves the illustration canvas.');
  }
 }
}
export function objectPose(object:Illustration['objects'][number],actions:IllustrationAction[],time:number){
 let x=object.x,y=object.y,opacity=1,scale=1,rotation=0;
 for(const a of actions.filter(a=>a.targetId===object.id)){
  if(time<a.at){if(a.action==='reveal')opacity=0;continue;}
  const elapsed=time-a.at,progress=a.repeat?(elapsed%a.duration)/a.duration:Math.min(1,elapsed/a.duration);
  if(a.action==='reveal')opacity=progress;
  if(a.action==='move'){const p=a.repeat?progress:1-Math.pow(1-progress,3);x=object.x+(a.toX!-object.x)*p;y=object.y+(a.toY!-object.y)*p;}
  if(a.action==='pulse')scale=1+.07*Math.sin(progress*Math.PI*2);
  if(a.action==='rotate')rotation=progress*360;
 }
 return {x,y,opacity,scale,rotation};
}
