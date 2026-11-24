import {createHash} from 'node:crypto';
import {validatePlan,scriptFor,type Plan} from './contracts';
import {storyboardEstimate} from './storyboard-preview';
export {storyboardEstimate} from './storyboard-preview';

export const STORYBOARD_SCHEMA_VERSION=1;
export function checkedStoryboard(value:unknown){
 const plan=validatePlan(value);
 if(JSON.stringify(plan).length>250000)throw Error('Storyboard too large');
 const duration=storyboardEstimate(plan).duration;
 if(duration<40||duration>90)throw Error('Adjust narration to an estimated 40–90 seconds.');
 if(!plan.scenes.every(s=>s.illustration||s.arrayStory||s.motion))throw Error('Every scene needs explanatory motion.');
 return plan;
}
function canonical(value:unknown):string {
 if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
 if(value&&typeof value==='object')return '{'+Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>JSON.stringify(k)+':'+canonical(v)).join(',')+'}';
 return JSON.stringify(value);
}
export function storyboardHash(plan:Plan,settings:unknown){return createHash('sha256').update(canonical({plan,settings,schemaVersion:STORYBOARD_SCHEMA_VERSION})).digest('hex');}
export function scopeCandidate(source:Plan,candidate:Plan,sceneId?:string,narration?:string){
 if(!sceneId)return checkedStoryboard(candidate);
 const replacement=candidate.scenes.find(s=>s.id===sceneId);
 if(!replacement)throw Error('Edited scene missing');
 if(narration!==undefined&&replacement.narration!==narration)throw Error('The requested narration must be preserved exactly.');
 return checkedStoryboard({...source,scenes:source.scenes.map(s=>s.id===sceneId?replacement:s)});
}
