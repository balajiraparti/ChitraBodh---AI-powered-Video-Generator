import path from 'node:path';
import {existsSync} from 'node:fs';
import {bundle} from '@remotion/bundler';
import {renderMedia,renderStill,selectComposition,makeCancelSignal} from '@remotion/renderer';
import type {VideoProps} from './contracts';
export function browserPath(){return process.env.BROWSER_EXECUTABLE||['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe','C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'].find(existsSync);}
export async function render(props:VideoProps,directory:string,signal:AbortSignal){
 const serveUrl=await bundle({entryPoint:path.resolve('src/video/index.tsx')});
 const browserExecutable=browserPath();
 const composition=await selectComposition({serveUrl,id:'Explainer',inputProps:props,browserExecutable});
 const {cancelSignal,cancel}=makeCancelSignal();signal.addEventListener('abort',cancel,{once:true});
 try{
  if(signal.aborted)throw new Error('Generation cancelled.');
  await renderStill({serveUrl,composition,inputProps:props,browserExecutable,output:path.join(directory,'thumbnail.png'),frame:300});
  let last=-1;
  await renderMedia({serveUrl,composition,inputProps:props,browserExecutable,outputLocation:path.join(directory,'video.mp4'),codec:'h264',crf:23,x264Preset:'veryfast',concurrency:2,cancelSignal,onProgress:({progress})=>{const step=Math.floor(progress*10);if(step!==last){last=step;console.log(`Rendering ${step*10}%`);}}});
 }finally{signal.removeEventListener('abort',cancel);}
}
