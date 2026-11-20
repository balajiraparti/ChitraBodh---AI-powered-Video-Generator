import {createHash,randomBytes,randomUUID,createCipheriv,createDecipheriv} from 'node:crypto';

export const instagramScopes=['instagram_business_basic','instagram_business_content_publish'];
const hash=value=>createHash('sha256').update(value).digest('hex');
export function instagramConfig(env=process.env){
  const {INSTAGRAM_APP_ID:appId,INSTAGRAM_APP_SECRET:secret,INSTAGRAM_REDIRECT_URI:redirectUri,INSTAGRAM_TOKEN_KEY:key,INSTAGRAM_API_VERSION:version}=env;
  if(!appId||!secret||!redirectUri||!key||!/^v\d+\.0$/.test(version??'')||!/^[a-f\d]{64}$/i.test(key))throw Error('INSTAGRAM_NOT_CONFIGURED');
  const url=new URL(redirectUri);
  if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/api/v1/instagram/callback')throw Error('INSTAGRAM_NOT_CONFIGURED');
  if(env.BETTER_AUTH_URL&&url.origin!==new URL(env.BETTER_AUTH_URL).origin)throw Error('INSTAGRAM_NOT_CONFIGURED');
  return {appId,secret,redirectUri,key:Buffer.from(key,'hex'),version};
}
export function sealToken(token,key,binding){
  const nonce=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,nonce);
  cipher.setAAD(Buffer.from(binding));
  return {tokenCiphertext:Buffer.concat([cipher.update(token,'utf8'),cipher.final()]).toString('base64'),tokenNonce:nonce.toString('base64'),tokenTag:cipher.getAuthTag().toString('base64'),encryptionKeyVersion:1};
}
export function openToken(row,key){
  const decipher=createDecipheriv('aes-256-gcm',key,Buffer.from(row.tokenNonce,'base64'));
  decipher.setAAD(Buffer.from(`${row._id}:${row.connectionId}`));decipher.setAuthTag(Buffer.from(row.tokenTag,'base64'));
  return Buffer.concat([decipher.update(Buffer.from(row.tokenCiphertext,'base64')),decipher.final()]).toString('utf8');
}
export function safeConnection(row,now=new Date()){
  if(!row?.accountId||row.status==='disconnected')return null;
  return {id:row.connectionId,accountId:row.accountId,username:row.username,revision:row.revision,status:+row.tokenExpiresAt<=+now?'needs_reconnection':row.status,tokenExpiresAt:row.tokenExpiresAt.toISOString(),scopes:row.scopes};
}
export async function beginInstagram(collection,owner,sessionId,config,now=new Date()){
  const state=randomBytes(32).toString('base64url'),expiresAt=new Date(+now+600000);
  const pending={stateHash:hash(state),sessionHash:hash(sessionId),expiresAt};
  try{await collection.updateOne({_id:owner},{$setOnInsert:{revision:0,status:'disconnected',dispatchEpoch:0}}, {upsert:true});}catch(e){if(e.code!==11000)throw e;}
  await collection.updateOne({_id:owner},{$set:{pending,oauthAttempt:pending.stateHash}});
  const url=new URL('https://www.instagram.com/oauth/authorize');
  url.search=new URLSearchParams({client_id:config.appId,redirect_uri:config.redirectUri,response_type:'code',scope:instagramScopes.join(','),state,force_reauth:'true'}).toString();
  return {authorizationUrl:url.toString(),expiresAt:expiresAt.toISOString()};
}
// No retries: authorization codes are single-use; uncertain exchanges require a fresh login.
export async function exchangeInstagram(code,config,fetcher=fetch){
  async function json(url,options={}){
    const response=await fetcher(url,{...options,redirect:'error',signal:AbortSignal.timeout(15000)});
    if(!response.ok)throw Error('INSTAGRAM_PROVIDER_UNAVAILABLE');
    const value=await response.json();if(value.error)throw Error('INSTAGRAM_PROVIDER_UNAVAILABLE');return value;
  }
  const form=new FormData();
  for(const [k,v] of Object.entries({client_id:config.appId,client_secret:config.secret,grant_type:'authorization_code',redirect_uri:config.redirectUri,code}))form.set(k,v);
  const result=await json('https://api.instagram.com/oauth/access_token',{method:'POST',body:form});
  if(result.data&&(!Array.isArray(result.data)||result.data.length!==1||result.access_token))throw Error('INSTAGRAM_INVALID_RESPONSE');
  const short=result.data?.[0]??result;
  const scopes=typeof short.permissions==='string'?short.permissions.split(',').map(s=>s.trim()):short.permissions;
  if(!short.access_token||!short.user_id||!Array.isArray(scopes)||!instagramScopes.every(s=>scopes.includes(s)))throw Error('INSTAGRAM_PERMISSIONS_REQUIRED');
  const url=new URL('https://graph.instagram.com/access_token');
  url.search=new URLSearchParams({grant_type:'ig_exchange_token',client_secret:config.secret,access_token:short.access_token}).toString();
  const long=await json(url);
  if(typeof long.access_token!=='string'||!Number.isFinite(long.expires_in)||long.expires_in<=0)throw Error('INSTAGRAM_INVALID_RESPONSE');
  const profile=await json(`https://graph.instagram.com/${config.version}/me?fields=user_id,username`,{headers:{Authorization:`Bearer ${long.access_token}`}});
  if(String(profile.user_id)!==String(short.user_id)||typeof profile.username!=='string'||!profile.username)throw Error('INSTAGRAM_INVALID_RESPONSE');
  return {accountId:String(short.user_id),username:profile.username,scopes:instagramScopes,token:long.access_token,expiresIn:long.expires_in};
}
export async function finishInstagram(collection,owner,sessionId,query,config,exchange=exchangeInstagram,now=new Date()){
  if(typeof query.state!=='string'||query.state.length>128)return 'invalid';
  const row=await collection.findOneAndUpdate({_id:owner,'pending.stateHash':hash(query.state),'pending.sessionHash':hash(sessionId),'pending.expiresAt':{$gt:now}},{$unset:{pending:''}},{returnDocument:'before'});
  if(!row)return 'invalid';
  if(query.error)return 'cancelled';
  if(typeof query.code!=='string'||!query.code||query.code.length>4096)return 'invalid';
  let identity;
  try{identity=await exchange(query.code,config);}catch{return 'failed';}
  if(row.status!=='disconnected'&&row.accountId&&row.accountId!==identity.accountId)return 'different_account';
  const connectionId=row.status==='disconnected'?randomUUID():row.connectionId;
  const encrypted=sealToken(identity.token,config.key,`${owner}:${connectionId}`);
  const updated=await collection.updateOne({_id:owner,revision:row.revision,oauthAttempt:row.oauthAttempt,pending:{$exists:false}},{$set:{connectionId,accountId:identity.accountId,username:identity.username,scopes:identity.scopes,status:'connected',tokenExpiresAt:new Date(Date.now()+identity.expiresIn*1000),checkedAt:new Date(),...encrypted},$inc:{revision:1,dispatchEpoch:1}});
  return updated.matchedCount?'connected':'superseded';
}
export async function disconnectInstagram(collection,owner,revision){
  if(!Number.isSafeInteger(revision)||revision<1)return false;
  const result=await collection.updateOne({_id:owner,revision},{$set:{status:'disconnected',disconnectedAt:new Date()},$inc:{revision:1,dispatchEpoch:1},$unset:{pending:'',tokenCiphertext:'',tokenNonce:'',tokenTag:'',tokenExpiresAt:''}});
  return result.matchedCount===1;
}
