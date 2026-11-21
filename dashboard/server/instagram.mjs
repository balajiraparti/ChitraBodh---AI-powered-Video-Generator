import {createHash,randomBytes,randomUUID,createCipheriv,createDecipheriv} from 'node:crypto';

export const instagramScopes=['instagram_basic','instagram_content_publish','instagram_manage_messages'];
const hash=value=>createHash('sha256').update(value).digest('hex');
export function instagramConfig(env=process.env){
  const {INSTAGRAM_APP_ID:appId,INSTAGRAM_APP_SECRET:secret,INSTAGRAM_CONFIG_ID:configId,INSTAGRAM_REDIRECT_URI:redirectUri,INSTAGRAM_TOKEN_KEY:key,INSTAGRAM_API_VERSION:version}=env;
  if(!/^\d+$/.test(appId??'')||!/^\d+$/.test(configId??'')||!secret||!redirectUri||!key||!/^v\d+\.0$/.test(version??'')||!/^[a-f\d]{64}$/i.test(key))throw Error('INSTAGRAM_NOT_CONFIGURED');
  const url=new URL(redirectUri);
  if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/api/v1/instagram/callback')throw Error('INSTAGRAM_NOT_CONFIGURED');
  if(env.BETTER_AUTH_URL&&url.origin!==new URL(env.BETTER_AUTH_URL).origin)throw Error('INSTAGRAM_NOT_CONFIGURED');
  return {appId,secret,configId,redirectUri,key:Buffer.from(key,'hex'),version};
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
  return {id:row.connectionId,accountId:row.accountId,username:row.username,revision:row.revision,status:row.loginFlow!=='unified'||+row.tokenExpiresAt<=+now?'needs_reconnection':row.status,tokenExpiresAt:row.tokenExpiresAt.toISOString(),scopes:row.scopes};
}
export async function beginInstagram(collection,owner,sessionId,config,now=new Date()){
  const state=randomBytes(32).toString('base64url'),expiresAt=new Date(+now+600000);
  const pending={stateHash:hash(state),sessionHash:hash(sessionId),expiresAt};
  try{await collection.updateOne({_id:owner},{$setOnInsert:{revision:0,status:'disconnected',dispatchEpoch:0}}, {upsert:true});}catch(e){if(e.code!==11000)throw e;}
  await collection.updateOne({_id:owner},{$set:{pending,oauthAttempt:pending.stateHash}});
  const url=new URL('https://www.facebook.com/dialog/oauth');
  url.search=new URLSearchParams({client_id:config.appId,config_id:config.configId,redirect_uri:config.redirectUri,response_type:'code',state,prompt:'login'}).toString();
  return {authorizationUrl:url.toString(),expiresAt:expiresAt.toISOString()};
}
// No retries: authorization codes are single-use; uncertain exchanges require a fresh login.
export async function exchangeInstagram(code,config,fetcher=fetch){
  async function json(url,options={}){
    const response=await fetcher(url,{...options,redirect:'error',signal:AbortSignal.timeout(15000)});
    if(!response.ok)throw Error('INSTAGRAM_PROVIDER_UNAVAILABLE');
    const value=await response.json();if(value.error)throw Error('INSTAGRAM_PROVIDER_UNAVAILABLE');return value;
  }
  const base=`https://graph.facebook.com/${config.version}`;
  const result=await json(`${base}/oauth/access_token?${new URLSearchParams({client_id:config.appId,client_secret:config.secret,redirect_uri:config.redirectUri,code})}`);
  if(typeof result.access_token!=='string'||!result.access_token)throw Error('INSTAGRAM_INVALID_RESPONSE');
  // Validate the grant rather than assuming that configured permissions were granted.
  const {data:grant}=await json(`${base}/debug_token?${new URLSearchParams({input_token:result.access_token})}`,{headers:{Authorization:`Bearer ${config.appId}|${config.secret}`}});
  if(grant?.is_valid!==true||String(grant.app_id)!==config.appId||!Array.isArray(grant.scopes)||!instagramScopes.every(s=>grant.scopes.includes(s)))throw Error('INSTAGRAM_PERMISSIONS_REQUIRED');
  // This pilot deliberately uses expiring (60-day) configurations only.
  const deadlines=[grant.expires_at,grant.data_access_expires_at].filter(v=>Number.isFinite(v)&&v>0);
  if(!Number.isFinite(grant.expires_at)||grant.expires_at<=0||!deadlines.length)throw Error('INSTAGRAM_INVALID_RESPONSE');
  const expiresAt=new Date(Math.min(...deadlines)*1000);
  if(+expiresAt<=Date.now())throw Error('INSTAGRAM_INVALID_RESPONSE');
  const headers={Authorization:`Bearer ${result.access_token}`};
  const business=await json(`${base}/me?fields=client_business_id`,{headers});
  if(typeof business.client_business_id!=='string'||!/^\d+$/.test(business.client_business_id))throw Error('INSTAGRAM_INVALID_RESPONSE');
  const accounts=await json(`${base}/me/assigned_instagram_accounts?fields=id,username&limit=2`,{headers});
  // Never silently pick the first account or follow a provider-supplied paging URL.
  if(!Array.isArray(accounts.data)||accounts.data.length!==1||accounts.paging?.next)throw Error('INSTAGRAM_SELECT_ONE_ACCOUNT');
  const profile=accounts.data[0];
  if(typeof profile.id!=='string'||!/^\d+$/.test(profile.id)||typeof profile.username!=='string'||!profile.username)throw Error('INSTAGRAM_INVALID_RESPONSE');
  for(const permission of instagramScopes){
    const scoped=grant.granular_scopes?.find(s=>s.scope===permission);
    if(scoped?.target_ids&&!scoped.target_ids.map(String).includes(profile.id))throw Error('INSTAGRAM_PERMISSIONS_REQUIRED');
  }
  return {accountId:profile.id,username:profile.username,clientBusinessId:business.client_business_id,scopes:instagramScopes,token:result.access_token,expiresAt};
}
export async function finishInstagram(collection,owner,sessionId,query,config,exchange=exchangeInstagram,now=new Date()){
  if(typeof query.state!=='string'||query.state.length>128)return 'invalid';
  const row=await collection.findOneAndUpdate({_id:owner,'pending.stateHash':hash(query.state),'pending.sessionHash':hash(sessionId),'pending.expiresAt':{$gt:now}},{$unset:{pending:''}},{returnDocument:'before'});
  if(!row)return 'invalid';
  if(query.error)return 'cancelled';
  if(typeof query.code!=='string'||!query.code||query.code.length>4096)return 'invalid';
  let identity;
  try{identity=await exchange(query.code,config);}catch(error){return error.message==='INSTAGRAM_SELECT_ONE_ACCOUNT'?'select_one_account':'failed';}
  if(row.status!=='disconnected'&&row.accountId&&row.accountId!==identity.accountId)return 'different_account';
  const connectionId=row.status==='disconnected'?randomUUID():row.connectionId;
  const encrypted=sealToken(identity.token,config.key,`${owner}:${connectionId}`);
  const updated=await collection.updateOne({_id:owner,revision:row.revision,oauthAttempt:row.oauthAttempt,pending:{$exists:false}},{$set:{connectionId,accountId:identity.accountId,username:identity.username,clientBusinessId:identity.clientBusinessId,configId:config.configId,loginFlow:'unified',scopes:identity.scopes,status:'connected',tokenExpiresAt:identity.expiresAt,checkedAt:new Date(),...encrypted},$inc:{revision:1,dispatchEpoch:1}});
  return updated.matchedCount?'connected':'superseded';
}
export async function disconnectInstagram(collection,owner,revision){
  if(!Number.isSafeInteger(revision)||revision<1)return false;
  const result=await collection.updateOne({_id:owner,revision},{$set:{status:'disconnected',disconnectedAt:new Date()},$inc:{revision:1,dispatchEpoch:1},$unset:{pending:'',tokenCiphertext:'',tokenNonce:'',tokenTag:'',tokenExpiresAt:''}});
  return result.matchedCount===1;
}
