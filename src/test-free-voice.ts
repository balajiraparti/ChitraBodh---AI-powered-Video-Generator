import 'dotenv/config';
import {writeFile} from 'node:fs/promises';
import path from 'node:path';
import {configuration} from './pipeline';
import {makeRun,runPath,saveManifest,purgeRun,RETENTION_MS} from './storage';
import {probe,command} from './media';

const voiceId='pNInz6obpgDQGcFmaJgB'; // Adam, documented by ElevenLabs in its streaming guide.
const config=configuration();
const text='Welcome to ChitraBodh. The sun warms water in rivers and oceans. Some of that water becomes an invisible gas called water vapor.';
const response=await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps?output_format=mp3_44100_128`,{method:'POST',headers:{'Content-Type':'application/json','xi-api-key':config.elevenKey},body:JSON.stringify({text,model_id:config.voiceModel}),signal:AbortSignal.timeout(60000)});
const data=await response.json() as any;
if(!response.ok){const code=String(data.detail?.status||'unknown').replace(/[^a-zA-Z0-9_]/g,'').slice(0,80);const message=String(data.detail?.message||'').split(config.elevenKey).join('[redacted]').slice(0,500);console.log(JSON.stringify({voice:'Adam',voiceId,status:response.status,code,message}));process.exitCode=1;}
else{
 const m=await makeRun('live',true);
 try{
  const file=path.join(runPath(m.id),'adam-sample.mp3');await writeFile(file,Buffer.from(data.audio_base64,'base64'));
  const metadata=await probe(file);await command(process.env.FFMPEG_PATH||'ffmpeg',['-v','error','-i',file,'-f','null','-']);
  const alignment=data.alignment;
  if(!metadata.streams.some(s=>s.codec_type==='audio')||!alignment?.characters?.length)throw new Error('Audio or alignment missing.');
  await writeFile(path.join(runPath(m.id),'alignment.json'),JSON.stringify(alignment));
  m.state='sample_ready';m.duration=metadata.duration;m.readyAt=Date.now();m.expiresAt=m.readyAt+RETENTION_MS;await saveManifest(m);
  console.log(JSON.stringify({voice:'Adam',voiceId,status:response.status,duration:metadata.duration,timingElements:alignment.characters.length,transcriptMatches:alignment.characters.join('')===text,reportedCredits:response.headers.get('character-cost'),file}));
 }catch(error){await purgeRun(m.id);throw error;}
}
