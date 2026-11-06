import {generate} from '../src/pipeline.ts';
const controller=new AbortController();
process.on('message',message=>{if(message?.type==='cancel')controller.abort();});
process.once('message',async message=>{
  if(message?.type!=='start')return;
  try{
    const manifest=await generate({...message.options,signal:controller.signal,
      onProgress:stage=>{process.send?.({type:'stage',stage});}});
    process.send?.({type:'result',manifest});
    process.disconnect();
  }catch{
    process.send?.({type:'failed'});
    process.disconnect();
    process.exitCode=1;
  }
});
