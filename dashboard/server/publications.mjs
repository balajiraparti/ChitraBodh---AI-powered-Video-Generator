import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {z} from 'zod';
import {safeConnection,openToken} from './instagram.mjs';
import {canReadMedia} from './media.mjs';
export const digest=value=>createHash('sha256').update(value).digest('hex');
export const publishLeaseMs=60000;
const input=z.object({artifactId:z.string().min(1).max(128),connectionId:z.uuid(),description:z.string().max(8800).refine(v=>[...v].length<=2200),mode:z.literal('now'),confirmed:z.literal(true)}).strict();
export function publicationView(row){return {id:row._id,artifactId:row.artifactId,projectId:row.projectId,versionId:row.versionId,accountId:row.accountIdSnapshot,username:row.usernameSnapshot,state:row.state,createdAt:row.createdAt.toISOString(),expiresAt:row.mediaExpiresAt.toISOString(),safeError:row.safeError??null,mediaId:row.mediaId??null,permalink:row.permalink??null,warning:row.warning??false};}
export function publishingOrigin(env=process.env){const u=new URL(env.BETTER_AUTH_URL);if(u.protocol!=='https:'||u.username||u.password)throw Error('HTTPS_REQUIRED');return u.origin;}
export async function publicationEligibility(store,owner,artifactId,connectionId,now=new Date(),session){
  const artifact=await store.artifacts.findOne({_id:artifactId,ownerId:owner},{session});
  if(!artifact)return {reason:'MEDIA_NOT_FOUND'};
  const project=await store.projects.findOne({_id:artifact.projectId,ownerId:owner},{session});
  if(!project||project.deletedAt||project.status==='deleting')return {reason:'MEDIA_NOT_FOUND'};
  if(!canReadMedia(artifact,owner,now))return {reason:'MEDIA_EXPIRED'};
  if(+artifact.expiresAt-+now<300000)return {reason:'TOO_CLOSE_TO_EXPIRY'};
  const connection=await store.instagramConnections.findOne({_id:owner},{session});
  if(safeConnection(connection,now)?.status!=='connected'||connection.connectionId!==connectionId||!connection.scopes?.includes('instagram_content_publish'))return {reason:'RECONNECT_REQUIRED'};
  return {artifact,connection,project};
}
export async function submitPublication(store,owner,key,body,now=new Date()){
  const parsed=input.safeParse(body);
  if(!parsed.success||!z.uuid().safeParse(key).success)return {status:400,error:'INVALID_REQUEST'};
  const args=parsed.data,signature=digest(JSON.stringify(args));
  const known=async(session)=>{const row=await store.publishJobs.findOne({ownerId:owner,key},{session});return row?(row.signature===signature?{status:202,data:publicationView(row)}:{status:409,error:'KEY_REUSED'}):null;};
  try{return await store.client.withSession(session=>session.withTransaction(async()=>{
    const prior=await known(session);if(prior)return prior;
    const e=await publicationEligibility(store,owner,args.artifactId,args.connectionId,now,session);
    if(e.reason)return {status:e.reason==='MEDIA_NOT_FOUND'?404:422,error:e.reason};
    const {artifact,connection}=e;
    const duplicate=await store.publishJobs.findOne({ownerId:owner,artifactId:artifact._id,accountIdSnapshot:connection.accountId,duplicateBlocked:true},{session});
    if(duplicate)return {status:409,error:'PUBLICATION_EXISTS',data:publicationView(duplicate)};
    // These writes serialize admission and dispatch with disconnect and media mutation.
    await store.instagramConnections.updateOne({_id:owner,revision:connection.revision},{$inc:{publishGuard:1}},{session});
    await store.artifacts.updateOne({_id:artifact._id},{$inc:{publishGuard:1}},{session});
    await store.projects.updateOne({_id:artifact.projectId},{$inc:{publishGuard:1}},{session});
    const row={_id:randomUUID(),ownerId:owner,key,signature,artifactId:artifact._id,projectId:artifact.projectId,versionId:artifact.versionId,connectionId:connection.connectionId,connectionEpoch:connection.dispatchEpoch,accountIdSnapshot:connection.accountId,usernameSnapshot:connection.username,mediaExpiresAt:artifact.expiresAt,deadlineAt:new Date(Math.min(+artifact.expiresAt,+now+900000)),createdAt:now,nextRunAt:now,leaseUntil:new Date(0),state:'queued',duplicateBlocked:true,fence:0};
    await store.publishJobs.insertOne(row,{session});
    await store.publishPayloads.insertOne({_id:row._id,ownerId:owner,description:args.description,expiresAt:artifact.expiresAt},{session});
    return {status:202,data:publicationView(row)};
  }));}catch(error){if(error.code!==11000)throw error;const prior=await known();if(prior)return prior;const row=await store.publishJobs.findOne({ownerId:owner,artifactId:args.artifactId,duplicateBlocked:true});if(row)return {status:409,error:'PUBLICATION_EXISTS',data:publicationView(row)};throw error;}
}
export async function claimPublication(store,now=new Date()){
  // Lost dispatch responses are never reset to queued, even after lease expiry.
  return store.publishJobs.findOneAndUpdate({state:{$in:['queued','preparing','processing','publishing','outcome_unknown']},nextRunAt:{$lte:now},leaseUntil:{$lte:now}},{$set:{leaseUntil:new Date(+now+publishLeaseMs),leaseOwner:randomUUID()},$inc:{fence:1}},{sort:{nextRunAt:1,createdAt:1,_id:1},returnDocument:'after'});
}
const lease=(row,now=new Date())=>({_id:row._id,fence:row.fence,leaseOwner:row.leaseOwner,leaseUntil:{$gt:now}});
export async function savePublication(store,row,fields,delay=0){
  return (await store.publishJobs.updateOne(lease(row),{$set:{...fields,nextRunAt:new Date(Date.now()+delay),leaseUntil:new Date(0)}})).matchedCount===1;
}
async function dispatchGuard(store,row,state){
  return store.client.withSession(session=>session.withTransaction(async()=>{
    const now=new Date();
    const current=await store.publishJobs.findOne({...lease(row,now),state:row.state},{session});
    if(!current||+row.deadlineAt<=+now)return false;
    const c=await store.instagramConnections.findOne({_id:row.ownerId,connectionId:row.connectionId,accountId:row.accountIdSnapshot,dispatchEpoch:row.connectionEpoch,status:'connected',tokenExpiresAt:{$gt:now}},{session});
    const a=await store.artifacts.findOne({_id:row.artifactId,ownerId:row.ownerId,state:'ready',expiresAt:{$gt:now}},{session});
    const p=await store.projects.findOne({_id:row.projectId,ownerId:row.ownerId,deletedAt:{$exists:false},status:{$ne:'deleting'}},{session});
    if(!c||!a||!p)return false;
    await store.instagramConnections.updateOne({_id:c._id},{$inc:{publishGuard:1}},{session});
    await store.artifacts.updateOne({_id:a._id},{$inc:{publishGuard:1}},{session});
    await store.projects.updateOne({_id:p._id},{$inc:{publishGuard:1}},{session});
    await store.publishJobs.updateOne(lease(row,now),{$set:{state,...(state==='publishing'?{dispatchIntentAt:now}:{})}},{session});return true;
  }));
}
export async function resolvePublishingMedia(store,token,now=new Date()){
  if(typeof token!=='string'||!/^[\w-]{43}$/.test(token))return null;
  const grant=await store.mediaGrants.findOne({_id:digest(token),expiresAt:{$gt:now}});if(!grant)return null;
  const row=await store.publishJobs.findOne({_id:grant.publishJobId,artifactId:grant.artifactId,state:{$in:['preparing','processing','publishing','outcome_unknown']}});if(!row)return null;
  const c=await store.instagramConnections.findOne({_id:row.ownerId,connectionId:row.connectionId,accountId:row.accountIdSnapshot,dispatchEpoch:row.connectionEpoch,status:'connected',tokenExpiresAt:{$gt:now}});if(!c)return null;
  const project=await store.projects.findOne({_id:row.projectId,ownerId:row.ownerId,deletedAt:{$exists:false},status:{$ne:'deleting'}});if(!project)return null;
  const a=await store.artifacts.findOne({_id:row.artifactId,ownerId:row.ownerId});return canReadMedia(a,row.ownerId,now)?a:null;
}
export async function runPublicationStep(store,row,config,provider,origin){
  const uncertain=['publishing','outcome_unknown'].includes(row.state);
  const fail=message=>savePublication(store,row,{state:'failed',duplicateBlocked:false,safeError:message});
  const unknown=message=>savePublication(store,row,{state:'outcome_unknown',safeError:message},60000);
  const c=await store.instagramConnections.findOne({_id:row.ownerId,connectionId:row.connectionId,accountId:row.accountIdSnapshot,status:'connected',tokenExpiresAt:{$gt:new Date()}});
  if(!c)return uncertain?savePublication(store,row,{state:'needs_attention',safeError:'Reconnect the same Instagram account, then check status. Do not repost.'}):fail('Instagram disconnected or expired. Reconnect and submit a new request.');
  let token;try{token=openToken(c,config.key);}catch{return uncertain?unknown('Could not check Instagram status.'):fail('Instagram credentials could not be read. Reconnect your account.');}
  if(uncertain){
    try{
      const status=await provider.status(row.containerId,token);
      if(status==='PUBLISHED')return savePublication(store,row,{state:'published',publishedAt:new Date(),safeError:null});
      if(['ERROR','EXPIRED'].includes(status))return savePublication(store,row,{state:'failed_confirmed',duplicateBlocked:false,safeError:'Meta confirmed that the container did not publish.'});
      if(Date.now()-+row.dispatchIntentAt>86400000)return savePublication(store,row,{state:'needs_attention',safeError:'Publication is still unconfirmed. Check Instagram before taking further action.'});
      return unknown('Meta has not confirmed the outcome. Do not repost; check status again.');
    }catch{return unknown('Could not confirm the result with Meta. Do not repost; check status again.');}
  }
  if(Date.now()>=+row.deadlineAt)return fail('The publishing deadline passed. This request was not dispatched.');
  if(c.dispatchEpoch!==row.connectionEpoch)return fail('The Instagram connection changed. Confirm a new request to publish.');
  if(row.state==='preparing')return fail('Preparation was interrupted before publishing. You can submit a new request.');
  if(row.state==='queued'){
    let dispatched=false;
    try{
      await provider.verify(row.accountIdSnapshot,token);
      const payload=await store.publishPayloads.findOne({_id:row._id,expiresAt:{$gt:new Date()}});
      if(!payload)return fail('The post description has expired.');
      if(!await dispatchGuard(store,row,'preparing'))return fail('The video or connection is no longer eligible.');
      const grantToken=randomBytes(32).toString('base64url');
      await store.mediaGrants.insertOne({_id:digest(grantToken),publishJobId:row._id,artifactId:row.artifactId,expiresAt:row.mediaExpiresAt});
      dispatched=true;
      const containerId=await provider.create(row.accountIdSnapshot,token,origin+'/api/v1/publishing-media/'+grantToken,payload.description);
      return savePublication(store,row,{state:'processing',containerId,safeError:null},60000);
    }catch{return fail(dispatched?'Meta preparation could not be confirmed. No publish request was sent.':'Could not prepare this post. Check the connection, account publishing limit and video availability.');}
  }
  if(row.state==='processing'){
    try{
      const status=await provider.status(row.containerId,token);
      if(status==='PUBLISHED')return savePublication(store,row,{state:'published',publishedAt:new Date(),safeError:null});
      if(['ERROR','EXPIRED'].includes(status))return fail('Meta could not process this video. No publish request was sent.');
      if(status!=='FINISHED')return savePublication(store,row,{},60000);
      await provider.verify(row.accountIdSnapshot,token);
    }catch{return savePublication(store,row,{safeError:'Waiting for Meta. We will check processing again.'},60000);}
    // Commit intent BEFORE the only non-idempotent publish call. A crash here becomes unknown.
    if(!await dispatchGuard(store,row,'publishing'))return fail('The video or connection is no longer eligible.');
    let result;
    try{result=await provider.publish(row.accountIdSnapshot,token,row.containerId);}
    catch{return unknown('Meta may have published this video. Check status; do not submit it again.');}
    // Save confirmed media ID before optional permalink lookup, so lookup errors never cause a repost.
    const saved=await savePublication(store,row,{state:'published',publishedAt:new Date(),mediaId:result.mediaId,warning:result.warning,safeError:null});
    if(saved){try{const permalink=await provider.permalink(result.mediaId,token);await store.publishJobs.updateOne({_id:row._id,state:'published',mediaId:result.mediaId},{$set:{permalink}});}catch{/* Published is authoritative even if link lookup fails. */}}
    return saved;
  }
}
