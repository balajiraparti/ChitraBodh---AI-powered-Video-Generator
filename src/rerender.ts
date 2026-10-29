import 'dotenv/config';
import {readFile,mkdir,rename,rm} from 'node:fs/promises';
import path from 'node:path';
import {assertAvailable,runPath,acquireLock,JOB_LIMIT_MS} from './storage';
import {validatePlan,type Timeline} from './contracts';
import {render} from './render';
import {validateMedia} from './media';

// Visual-only revision: reuse unexpired narration and timings without API calls.
const id=process.argv[2];const manifest=await assertAvailable(id);const release=await acquireLock();
const directory=runPath(id),temporary=path.join(directory,'visual-revision');
const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),Math.min(JOB_LIMIT_MS,manifest.expiresAt-Date.now()));
try{
 await mkdir(temporary,{recursive:true});
 const plan=validatePlan(JSON.parse(await readFile(path.join(directory,'plan.json'),'utf8')));
 const timeline=JSON.parse(await readFile(path.join(directory,'timeline.json'),'utf8')) as Timeline;
 const audioUrl=manifest.mode==='live'?`data:audio/mpeg;base64,${(await readFile(path.join(directory,'narration.mp3'))).toString('base64')}`:undefined;
 await render({plan,timeline,audioUrl,captions:manifest.captions,demo:manifest.mode==='demo'},temporary,controller.signal);
 await validateMedia(path.join(temporary,'video.mp4'),manifest.mode==='demo',controller.signal);
 await assertAvailable(id); // Never extend expiry for a revision.
 for(const filename of ['video.mp4','thumbnail.png'])await rename(path.join(temporary,filename),path.join(directory,filename));
 console.log('Visual revision ready. Existing expiry preserved. No provider calls made.');
}finally{clearTimeout(timeout);await rm(temporary,{recursive:true,force:true});await release();}
