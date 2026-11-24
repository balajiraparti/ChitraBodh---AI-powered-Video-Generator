import {scriptFor,type Plan} from './contracts';
import {buildTimeline} from './timing';
export function storyboardEstimate(plan:Plan){
 const script=scriptFor(plan),duration=script.trim().split(/\s+/).length/2.6;
 const characters=Array.from(script),step=duration/characters.length;
 return buildTimeline(plan,{characters,character_start_times_seconds:characters.map((_,i)=>i*step),character_end_times_seconds:characters.map((_,i)=>(i+1)*step)},duration);
}
