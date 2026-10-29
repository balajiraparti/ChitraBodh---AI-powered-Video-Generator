import {z} from 'zod';
export const ArrayEventSchema=z.object({
 action:z.enum(['show','compare','discard_left','discard_right','found','not_found']),
 low:z.number().int(),high:z.number().int(),mid:z.number().int(),
 phrase:z.string().min(1).max(160),occurrence:z.number().int().min(1)
});
export const ArrayStorySchema=z.object({values:z.array(z.number().int().min(0).max(99)).min(3).max(9),target:z.number().int().min(0).max(99),events:z.array(ArrayEventSchema).min(1).max(8)});
export type ArrayStory=z.infer<typeof ArrayStorySchema>;
export type ArrayEvent=z.infer<typeof ArrayEventSchema>;
export type TimedArrayEvent=ArrayEvent&{at:number};

// Validate AI-authored operations. Do not choose the example or silently repair it.
export function validateArrayStories(stories:(ArrayStory|undefined)[]){
 if(!stories.some(Boolean))return;
 if(stories.some(s=>!s))throw new Error('Every binary-search scene must preserve the same array story.');
 const first=stories[0]!;const {values,target}=first;
 if(values.some((v,i)=>i>0&&v<=values[i-1]))throw new Error('The example array must be strictly increasing.');
 let low=0,high=values.length-1,compared=false,terminal=false;
 for(const story of stories){
  if(JSON.stringify(story!.values)!==JSON.stringify(values)||story!.target!==target)throw new Error('Array or target changed between scenes.');
  for(const event of story!.events){
   if(event.low!==low||event.high!==high)throw new Error(`Wrong search bounds: expected low=${low}, high=${high}.`);
   if(event.action==='show'){if(event.mid!==-1)throw new Error('Use mid=-1 for show.');continue;}
   if(terminal)throw new Error('An operation follows the terminal result.');
   if(event.action==='not_found'){if(low<=high||event.mid!==-1)throw new Error('Not-found requires an empty interval and mid=-1.');terminal=true;continue;}
   const mid=Math.floor((low+high)/2);
   if(low>high||event.mid!==mid)throw new Error(`Wrong midpoint: expected ${mid}.`);
   if(event.action==='compare'){if(compared)throw new Error('Resolve the previous comparison first.');compared=true;continue;}
   if(!compared)throw new Error('Compare the midpoint before a decision.');
   if(event.action==='discard_left'){if(values[mid]>=target)throw new Error('Incorrect left-half elimination.');low=mid+1;}
   if(event.action==='discard_right'){if(values[mid]<=target)throw new Error('Incorrect right-half elimination.');high=mid-1;}
   if(event.action==='found'){if(values[mid]!==target)throw new Error('The highlighted value is not the target.');terminal=true;}
   compared=false;
  }
 }
 if(!terminal)throw new Error('Binary search must reach found or not_found.');
}
