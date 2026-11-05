import {createHash} from 'node:crypto';

const uuid = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
export function validTopic(topic) {
  return typeof topic === 'string' && topic.trim().length > 0 && [...topic].length <= 2000;
}
const view = row => ({id:row._id,topic:row.topic,revision:row.revision});
export async function readDraft(projects,ownerId,id) {
  const filter={ownerId,status:'draft'};
  if(id !== undefined) filter._id=id;
  const row=await projects.findOne(filter,{sort:{updatedAt:-1,_id:-1}});
  return row ? view(row) : null;
}
export async function saveDraft(projects,ownerId,id,body,key) {
  if(!validTopic(body?.topic))return {status:400};
  const topic=body.topic.trim();
  if(id === undefined) {
    if(typeof key!=='string'||!uuid.test(key))return {status:400};
    const _id=createHash('sha256').update(JSON.stringify([ownerId,key])).digest('hex');
    const now=new Date();
    const draft={_id,ownerId,topic,initialDigest:createHash('sha256').update(topic).digest('hex'),status:'draft',revision:1,createdAt:now,updatedAt:now};
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
    {$set:{topic,updatedAt:new Date()},$inc:{revision:1}},{returnDocument:'after'});
  if(updated)return {status:200,data:view(updated)};
  return {status:await projects.findOne(match)?409:404};
}
