import {createHash} from 'node:crypto';

import {defaultVoice,narratorChoices} from './narrators.mjs';

const uuid = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
export function validTopic(topic) {
  return typeof topic === 'string' && topic.trim().length > 0 && [...topic].length <= 2000;
}
const view = row => ({id:row._id,topic:row.topic,revision:row.revision,voiceCatalogId:row.voiceCatalogId ?? defaultVoice,captions:row.captions ?? true});
export async function readDraft(projects,ownerId,id) {
  const filter={ownerId,status:'draft'};
  if(id !== undefined) filter._id=id;
  const row=await projects.findOne(filter,{sort:{updatedAt:-1,_id:-1}});
  return row ? view(row) : null;
}
export async function saveDraft(projects,ownerId,id,body,key,defaults={}) {
  if(!validTopic(body?.topic))return {status:400};
  const topic=body.topic.trim();
  const choices={};
  if(body.voiceCatalogId !== undefined) {
    if(!narratorChoices().some(v=>v.id===body.voiceCatalogId && v.available))return {status:422};
    choices.voiceCatalogId=body.voiceCatalogId;
  }
  if(body.captions !== undefined) {
    if(typeof body.captions!=='boolean')return {status:400};
    choices.captions=body.captions;
  }
  if(id === undefined) {
    if(typeof key!=='string'||!uuid.test(key))return {status:400};
    const _id=createHash('sha256').update(JSON.stringify([ownerId,key])).digest('hex');
    const now=new Date();
    const settings={voiceCatalogId:defaults.voiceCatalogId??defaultVoice,captions:defaults.captions??true,...choices};
    // Preserve topic-only retry keys issued by older clients.
    const fingerprint=Object.keys(choices).length ? JSON.stringify([topic,settings.voiceCatalogId,settings.captions]) : topic;
    const draft={_id,ownerId,topic,...settings,initialDigest:createHash('sha256').update(fingerprint).digest('hex'),status:'draft',revision:1,createdAt:now,updatedAt:now};
    try { await projects.insertOne(draft);return {status:201,data:view(draft)}; }
    catch(error){
      if(error.code!==11000)throw error;
      const original=await projects.findOne({_id,ownerId,status:'draft'});
      return original?.initialDigest===draft.initialDigest ? {status:200,data:view(original)} : {status:409};
    }
  }
  if(!Number.isSafeInteger(body.expectedRevision)||body.expectedRevision<1)return {status:400};
  const match={_id:id,ownerId,status:'draft'};
  const updated=await projects.findOneAndUpdate({...match,revision:body.expectedRevision},
    {$set:{topic,...choices,updatedAt:new Date()},$inc:{revision:1}},{returnDocument:'after'});
  if(updated)return {status:200,data:view(updated)};
  return {status:await projects.findOne(match)?409:404};
}
