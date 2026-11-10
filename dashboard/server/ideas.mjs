import {ObjectId} from 'mongodb';
import {createHash,randomUUID} from 'node:crypto';
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
    if(cmd.status==='running')return cmd.leaseUntil>new Date()?fail(409,'COMMAND_IN_PROGRESS',2):null;
    if(cmd.status==='failed')return fail(503,cmd.errorCode||'IDEAS_UNAVAILABLE');
    const result=await ideaPayloads.findOne({_id:cmdId,expiresAt:{$gt:new Date()}});
    return result?{status:200,data:result.data,replayed:true}:fail(410,'RESULT_EXPIRED');
  }
  const prior=await replay();
  if(prior)return prior;
  const ids=ObjectId.isValid(owner)?[owner,new ObjectId(owner)]:[owner];
  const eligible=await store.db.collection('user').findOne({_id:{$in:ids},$or:[{emailVerified:true},{brainstormApproved:true}]},{projection:{_id:1}});
  if(!eligible)return fail(403,'ACCOUNT_APPROVAL_REQUIRED');
  const attempt=randomUUID(), leaseUntil=new Date(Date.now()+60000);
  try{await ideaLocks.updateOne({_id:owner,expiresAt:{$lte:now}},{$set:{cmdId,attempt,expiresAt:leaseUntil}},{upsert:true});}
  catch(error){if(error.code===11000)return (await replay())||fail(409,'COMMAND_IN_PROGRESS',2);throw error;}
  try{
    const afterLock=await replay();
    if(afterLock)return afterLock;
    if(!await reserve(store.limits,'brainstorm:'+owner,6,60000))return fail(429,'RATE_LIMITED',60);
    if(!await reserve(store.limits,'brainstorm:global:day',60,day))return fail(429,'GLOBAL_BUDGET_REACHED',86400);
    const claim=await ideaCommands.updateOne({_id:cmdId,hash,status:'running',leaseUntil:{$lte:new Date()}},
      {$set:{attempt,leaseUntil,expiresAt:new Date(+now+2*day)}},{upsert:true}).catch(error=>{
        if(error.code!==11000)throw error;
        return null;
      });
    if(!claim)return (await replay())||fail(409,'COMMAND_IN_PROGRESS',2);
    const history=await ideaPayloads.findOne({_id:historyId,expiresAt:{$gt:now}});
    const pairs=history?.pairs||[];
    let answer;
    try{answer=await infer(ideaInput(pairs,message));}
    catch(error){
      const code=['IDEAS_INVALID_REPLY','IDEAS_PROVIDER_CONFIG','IDEAS_PROVIDER_LIMIT'].includes(error?.message)?error.message:'IDEAS_UNAVAILABLE';
      await ideaCommands.updateOne({_id:cmdId,attempt},{$set:{status:'failed',errorCode:code}});return fail(503,code);
    }
    const finished=new Date(),expiresAt=new Date(+finished+day);
    const data={draftId:draftId??null,...answer,historyExpiresAt:expiresAt.toISOString(),serverNow:finished.toISOString()};
    const committed=await store.client.withSession(session=>session.withTransaction(async()=>{
      const finish=await ideaCommands.updateOne({_id:cmdId,attempt,status:'running'},{$set:{status:'completed'}},{session});
      if(!finish.matchedCount)return;
      await ideaPayloads.updateOne({_id:historyId},{$set:{pairs:[...pairs,{message,...answer}].slice(-6),expiresAt}},{session,upsert:true});
      await ideaPayloads.insertOne({_id:cmdId,data,expiresAt},{session});
      return true;
    }));
    return committed?{status:200,data}:(await replay())||fail(409,'COMMAND_IN_PROGRESS',2);
  }finally{await ideaLocks.deleteOne({_id:owner,cmdId,attempt});}
}
