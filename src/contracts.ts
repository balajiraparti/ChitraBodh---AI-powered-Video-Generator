import {z} from 'zod';

export const ICONS = ['sun','water','cloud','rain','vapor','leaf','chip','database','bulb','arrow','book','globe','check','clock'] as const;
const node = z.object({id:z.string().regex(/^[a-z][a-z0-9_]{0,39}$/),iconId:z.enum(ICONS),label:z.string().min(1).max(32)});
export const PlanSchema = z.object({
  title:z.string().min(1).max(90),
  learningObjective:z.string().min(1).max(250),
  scenes:z.array(z.object({
    id:z.string().regex(/^[a-z][a-z0-9_]{0,39}$/),
    layout:z.enum(['icon_text','process_diagram','comparison']),
    heading:z.string().min(1).max(60),
    narration:z.string().min(20).max(1300),
    nodes:z.array(node).min(1).max(4),
    edges:z.array(z.object({from:z.string(),to:z.string()})).max(6),
    cues:z.array(z.object({phrase:z.string().min(1).max(120),occurrence:z.number().int().min(1),targetId:z.string()})).min(1).max(6)
  })).min(4).max(8)
});
export type Plan = z.infer<typeof PlanSchema>;
export type Alignment = {characters:string[];character_start_times_seconds:number[];character_end_times_seconds:number[]};
export type Timeline = {duration:number;scenes:{id:string;start:number;end:number;cues:{targetId:string;at:number}[]}[];captions:{text:string;start:number;end:number}[]};
export type VideoProps = {plan:Plan;timeline:Timeline;audioUrl?:string;captions:boolean;demo:boolean};

export function findOccurrence(text:string, phrase:string, occurrence:number):number {
  let at=-1;
  for(let i=0;i<occurrence;i++) {at=text.indexOf(phrase,at+1); if(at<0) throw new Error('A visual cue does not occur in its scene narration.');}
  return at;
}
export function validatePlan(input:unknown):Plan {
  const plan=PlanSchema.parse(input);
  if(new Set(plan.scenes.map(s=>s.id)).size!==plan.scenes.length) throw new Error('Scene IDs must be unique.');
  for(const scene of plan.scenes) {
    const ids=new Set(scene.nodes.map(n=>n.id));
    if(ids.size!==scene.nodes.length) throw new Error('Node IDs must be unique within a scene.');
    if(scene.layout==='comparison' && scene.nodes.length!==2) throw new Error('Comparison requires exactly two nodes.');
    for(const edge of scene.edges) if(!ids.has(edge.from)||!ids.has(edge.to)||edge.from===edge.to) throw new Error('Invalid diagram edge.');
    for(const cue of scene.cues) {if(!ids.has(cue.targetId)) throw new Error('Unknown cue target.');findOccurrence(scene.narration,cue.phrase,cue.occurrence);}
  }
  return plan;
}
export const scriptFor=(plan:Plan)=>plan.scenes.map(s=>s.narration).join('\n');
