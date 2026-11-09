import {createHash} from 'node:crypto';
import {reserve} from './auth.mjs';
import {suggestIdeas} from './idea-provider.mjs';

const uuid=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const day=86400000;
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fail=(status,error,retry)=>({status,error,retry});
export function ideaInput(pairs,message){
  const result={history:[],message};
  for(const pair of pairs.slice(-6).reverse()){
    result.history.unshift(pair);
    if(JSON.stringify(result).length>8000){result.history.shift();break;}
  }
  return result;
}
export async function brainstorm(store,owner,key,body,infer=suggestIdeas){
  if(!uuid.test(key)||!body||typeof body.message!=='string'||Object.keys(body).some(k=>!['message','draftId','conversationId'].includes(k)))return fail(400,'INVALID_INPUT');
  const {draftId,conversationId}=body,message=body.message.trim();
  if(!message||[...message].length>1000||((draftId!==undefined)===(conversationId!==undefined))||
    (draftId!==undefined && (typeof draftId!=='string'||!/^[a-f0-9]{64}$/i.test(draftId)))||
    (conversationId!==undefined && (typeof conversationId!=='string'||!uuid.test(conversationId))))return fail(400,'INVALID_INPUT');
  if(draftId && !await store.projects.findOne({_id:draftId,ownerId:owner,status:'draft'},{projection:{_id:1}}))return fail(404,'DRAFT_NOT_FOUND');
  const scope=draftId||conversationId;
  const now=new Date(),cmdId=digest([owner,key]),hash=digest([scope,message]),historyId=digest([owner,scope]);
  const {ideaCommands,ideaLocks,ideaPayloads}=store;
  async function replay(){
    const cmd=await ideaCommands.findOne({_id:cmdId});
    if(!cmd)return null;
    if(cmd.hash!==hash)return fail(409,'KEY_REUSED');
    if(cmd.status==='running' && cmd.leaseUntil>new Date())return fail(409,'COMMAND_IN_PROGRESS',2);
    if(cmd.status==='failed')return fail(503,'IDEAS_UNAVAILABLE');
    const result=await ideaPayloads.findOne({_id:cmdId,expiresAt:{$gt:new Date()}});
    return result?{status:200,data:result.data,replayed:true}:fail(410,'RESULT_EXPIRED');
  }
  const prior=await replay();
  if(prior)return prior;
  const leaseUntil=new Date(+now+60000);
  try{await ideaLocks.updateOne({_id:owner,expiresAt:{$lte:now}},{$set:{cmdId,expiresAt:leaseUntil}},{upsert:true});}
  catch(error){if(error.code===11000)return (await replay())||fail(409,'COMMAND_IN_PROGRESS',2);throw error;}
  try{
    const afterLock=await replay();
    if(afterLock)return afterLock;
    if(!await reserve(store.limits,'brainstorm:'+owner,6,60000))return fail(429,'RATE_LIMITED',60);
    await ideaCommands.insertOne({_id:cmdId,hash,status:'running',leaseUntil,expiresAt:new Date(+now+2*day)});
    const history=await ideaPayloads.findOne({_id:historyId,expiresAt:{$gt:now}});
    const pairs=history?.pairs||[];
    let answer;
    try{answer=await infer(ideaInput(pairs,message));}
    catch{await ideaCommands.updateOne({_id:cmdId},{$set:{status:'failed'}});return fail(503,'IDEAS_UNAVAILABLE');}
    const finished=new Date(),expiresAt=new Date(+finished+day);
    const data={draftId:draftId??null,...answer,historyExpiresAt:expiresAt.toISOString(),serverNow:finished.toISOString()};
    await store.client.withSession(session=>session.withTransaction(async()=>{
      if(!await ideaLocks.findOne({_id:owner,cmdId,expiresAt:{$gt:new Date()}},{session}))throw Error('Lease expired');
      await ideaPayloads.updateOne({_id:historyId},{$set:{pairs:[...pairs,{message,...answer}].slice(-6),expiresAt}},{session,upsert:true});
      await ideaPayloads.insertOne({_id:cmdId,data,expiresAt},{session});
      await ideaCommands.updateOne({_id:cmdId},{$set:{status:'completed'}},{session});
    }));
    return {status:200,data};
  }finally{await ideaLocks.deleteOne({_id:owner,cmdId});}
}
