import {readFileSync} from 'node:fs';
import {parse} from 'dotenv';

export function resolveCredentials(env:Record<string,string|undefined>,local:Record<string,string>={}){
 const value=(name:string)=>local[name]??env[name]??'';
 return {
  geminiKey:value('GEMINI_API_KEY'),
  nvidiaKey:value('NVIDIA_API_KEY'),
  elevenKey:local.ELEVENLABS_API_KEY??local.ELEVEN_LABS_API_KEY??env.ELEVENLABS_API_KEY??env.ELEVEN_LABS_API_KEY??'',
  elevenFallbackKeys:[value('ELEVEN_LABS_BACKUP_API_KEY'),value('ELEVEN_LABS_BACKUP_API_KEY_NEW')].filter(Boolean)
 };
}
// Pick up locally rotated keys for each new job without restarting an active job.
export function currentCredentials(){
 let local:Record<string,string>={};
 try{local=parse(readFileSync('.env'));}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
 return resolveCredentials(process.env,local);
}
