export const VOICES = [
 {id:process.env.ELEVENLABS_MALE_VOICE_ID||'pNInz6obpgDQGcFmaJgB',name:'Adam',description:'Male narrator · Testing voice'},
 {id:process.env.ELEVENLABS_FEMALE_VOICE_ID||'C3aqZfd4M0h7Ys5tWGIS',name:'Monika Sogam',description:'Deep and natural'},
] as const;
export function isSupportedVoice(id:unknown):id is string{return typeof id==='string'&&VOICES.some(voice=>voice.id===id);}
