import 'dotenv/config';
import {generate} from './pipeline';
import {preview} from './preview';
import {cleanup} from './storage';
import {browserPath} from './render';
import {command} from './media';
import {VOICES} from './voices';
const args=process.argv.slice(2);const option=(name:string)=>{const i=args.indexOf(name);return i<0?undefined:args[i+1];};
try{
 switch(args[0]){
  case 'doctor':
   console.log(`Node: ${process.version}\nBrowser: ${browserPath()||'Not found: set BROWSER_EXECUTABLE'}`);
   console.log(`GEMINI_API_KEY: ${process.env.GEMINI_API_KEY?'configured':'missing'}`);
   console.log(`ELEVENLABS_API_KEY: ${process.env.ELEVENLABS_API_KEY||process.env.ELEVEN_LABS_API_KEY?'configured':'missing'}`);
   console.log(`Default voice: ${process.env.ELEVENLABS_VOICE_ID||VOICES[0].id}`);
   await command(process.env.FFPROBE_PATH||'ffprobe',['-version']);await command(process.env.FFMPEG_PATH||'ffmpeg',['-version']);console.log('FFmpeg and ffprobe: available');break;
  case 'demo':await generate({demo:true,captions:!args.includes('--no-captions')});break;
  case 'generate':await generate({demo:false,topic:option('--topic'),voice:option('--voice'),captions:!args.includes('--no-captions'),reviewedPlanFile:option('--plan')});break;
  case 'preview':await preview();break;
  case 'cleanup':console.log(`Removed ${(await cleanup()).length} expired runs.`);break;
  default:console.log('Commands: doctor | demo [--no-captions] | generate --topic "Your idea" [--voice ID] [--no-captions] | preview | cleanup');
 }
}catch(error){console.error(error instanceof Error?error.message:'Operation failed.');process.exitCode=1;}
