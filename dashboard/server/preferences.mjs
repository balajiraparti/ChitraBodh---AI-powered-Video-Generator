import {defaultVoice,narratorChoices} from './narrators.mjs';
export const defaults={voiceCatalogId:defaultVoice,captions:true,timezone:'Asia/Kolkata',language:'en-IN',revision:1};
export async function preferences(collection,owner){
  const row=await collection.findOne({_id:owner},{projection:{_id:0}});
  return {...defaults,...row};
}
export async function updatePreferences(collection,owner,body){
  if(!body || !Number.isSafeInteger(body.expectedRevision) || body.expectedRevision<1)return {status:400};
  const {expectedRevision,...changes}=body;
  if(!Object.keys(changes).length || Object.keys(changes).some(key=>!['voiceCatalogId','captions','timezone'].includes(key)))return {status:400};
  if('captions' in changes && typeof changes.captions!=='boolean')return {status:400};
  if('voiceCatalogId' in changes && !narratorChoices().some(v=>v.available && v.id===changes.voiceCatalogId))return {status:422};
  if('timezone' in changes){
    if(typeof changes.timezone!=='string'||!changes.timezone||changes.timezone.length>100||/^[+-]/.test(changes.timezone))return {status:422};
    try{new Intl.DateTimeFormat('en',{timeZone:changes.timezone});}catch{return {status:422};}
  }
  try{
    const row=await collection.findOneAndUpdate({_id:owner,revision:expectedRevision},
      {$set:{...changes,revision:expectedRevision+1}},{upsert:expectedRevision===1,returnDocument:'after',projection:{_id:0}});
    return row?{status:200,data:{...defaults,...row}}:{status:409};
  }catch(error){if(error.code===11000)return {status:409};throw error;}
}
