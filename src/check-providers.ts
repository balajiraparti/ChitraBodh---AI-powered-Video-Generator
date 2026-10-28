import 'dotenv/config';
import {configuration} from './pipeline';
import {VOICES} from './voices';
const config=configuration();
for(const voice of VOICES){
 try{const response=await fetch(`https://api.elevenlabs.io/v1/voices/${voice.id}`,{headers:{'xi-api-key':config.elevenKey},signal:AbortSignal.timeout(30000)});
 if(!response.ok){const error=await response.json() as any;const code=String(error.detail?.status||'unknown').replace(/[^a-zA-Z0-9_]/g,'').slice(0,80);console.log(`${voice.name}: HTTP ${response.status} (${code})`);continue;}
 const data=await response.json() as any;console.log(JSON.stringify({voice:voice.name,id:voice.id,name:data.name,labels:data.labels}));
 }catch{console.log(`${voice.name}: connection failed`);}
}
try{const response=await fetch('https://generativelanguage.googleapis.com/v1beta/models',{headers:{'x-goog-api-key':config.geminiKey},signal:AbortSignal.timeout(30000)});
 if(!response.ok)console.log(`Gemini model access: HTTP ${response.status}`);
 else {const data=await response.json() as any;console.log(JSON.stringify({configuredModel:config.geminiModel,models:data.models?.filter((m:any)=>m.supportedGenerationMethods?.includes('generateContent')).map((m:any)=>m.name)}));}
}catch{console.log('Gemini: connection failed');}
