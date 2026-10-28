import {spawn} from 'node:child_process';
export function command(executable:string,args:string[],signal?:AbortSignal):Promise<string> {
  return new Promise((resolve,reject)=>{
    const child=spawn(executable,args,{windowsHide:true,signal,stdio:['ignore','pipe','pipe']});let output='',errors='';
    child.stdout.on('data',d=>{if(output.length<1_000_000)output+=d;});child.stderr.on('data',d=>{if(errors.length<3000)errors+=d;});
    child.on('error',()=>reject(new Error(`Could not run ${executable}. Check installation or cancellation.`)));
    child.on('close',code=>code===0?resolve(output):reject(new Error(`${executable} failed (exit ${code}). ${errors.slice(-800)}`)));
  });
}
export async function probe(file:string,signal?:AbortSignal){const data=JSON.parse(await command(process.env.FFPROBE_PATH||'ffprobe',['-v','error','-show_format','-show_streams','-of','json',file],signal));return {duration:Number(data.format.duration),streams:data.streams as any[]};}
export async function validateMedia(file:string,demo:boolean,signal?:AbortSignal){const metadata=await probe(file,signal);const video=metadata.streams.find(s=>s.codec_type==='video');if(!video||video.width!==1080||video.height!==1920||metadata.duration<60||metadata.duration>90.001||!Number.isFinite(metadata.duration))throw new Error('Output failed dimensions/duration validation.');if(!demo&&!metadata.streams.some(s=>s.codec_type==='audio'))throw new Error('Narration audio is missing.');await command(process.env.FFMPEG_PATH||'ffmpeg',['-v','error','-i',file,'-f','null','-'],signal);return metadata;}
