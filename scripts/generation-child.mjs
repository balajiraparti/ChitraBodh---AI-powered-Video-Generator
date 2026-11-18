import {generate} from '../src/pipeline.ts';
import {safeDiagnostic} from './generation-diagnostics.mjs';
let lastStage='Starting generation';
const controller=new AbortController();
let lastHeartbeat = Date.now();
let completed = false;
const watchdog = setInterval(() => {
  if (Date.now() - lastHeartbeat > 10000) { controller.abort(); clearInterval(watchdog); }
}, 1000);
process.on('disconnect', () => { clearInterval(watchdog); if (!completed) controller.abort(); });

function send(message) {
  if (process.connected) process.send(message, () => {});
}
process.on('message',message=>{if(message?.type==='cancel')controller.abort();if(message?.type==='heartbeat')lastHeartbeat=Date.now();});
process.once('message',async message=>{
  if(message?.type!=='start')return;
  try{
    const manifest=await generate({...message.options,signal:controller.signal,
      onDiagnostic:category=>send({type:'diagnostic',category}),
      onRenderPercent:percent=>send({type:'stage',stage:'Rendering video',percent}),
      onProgress:stage=>{lastStage=stage;send({type:'stage',stage});}});
    send({type:'result',manifest});

  }catch(error){
    send({type:'failed',diagnostic:safeDiagnostic(error,lastStage)});

    process.exitCode=1;
  } finally {
    completed=true;
    clearInterval(watchdog);
    if (process.connected) process.disconnect();
  }
});
