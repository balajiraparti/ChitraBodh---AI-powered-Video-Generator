import 'dotenv/config';
import {configuration} from './pipeline';
import {VOICES} from './voices';
const config=configuration();
for(const voice of VOICES){
 const response=await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice.id}/with-timestamps?output_format=mp3_44100_128`,{method:'POST',headers:{'Content-Type':'application/json','xi-api-key':config.elevenKey},body:JSON.stringify({text:'Welcome to ChitraBodh. Let us learn something new.',model_id:config.voiceModel}),signal:AbortSignal.timeout(60000)});
 const data=await response.json() as any;
 if(response.ok){console.log(`${voice.name}: speech response received; audio bytes ${Buffer.from(data.audio_base64||'','base64').length}; timing elements ${data.alignment?.characters?.length||0}`);}
 else {const code=String(data.detail?.status||'unknown').replace(/[^a-zA-Z0-9_]/g,'').slice(0,80);let message=String(data.detail?.message||'').split(config.elevenKey).join('[redacted]').slice(0,400);console.log(`${voice.name}: HTTP ${response.status}; ${code}; ${message}`);}
}
