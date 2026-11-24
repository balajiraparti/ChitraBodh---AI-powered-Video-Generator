// Meta Unified Login. Never log request URLs, tokens, captions or provider bodies.
export function publishingProvider(config,fetcher=fetch){
  const base=`https://graph.facebook.com/${config.version}`;
  async function call(path,token,body){
    const response=await fetcher(base+'/'+path,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${token}`,...(body?{'Content-Type':'application/x-www-form-urlencoded'}:{})},body:body?new URLSearchParams(body):undefined,redirect:'error',signal:AbortSignal.timeout(15000)});
    const data=await response.json();
    if(!response.ok||data.error)throw Error('META_UNAVAILABLE');
    return data;
  }
  const id=value=>{if(typeof value!=='string'||!/^\d+$/.test(value))throw Error('META_INVALID_RESPONSE');return value;};
  return {
    async verify(account,token){
      const grant=await call('debug_token?'+new URLSearchParams({input_token:token}),`${config.appId}|${config.secret}`);
      const g=grant.data;
      if(g?.is_valid!==true||String(g.app_id)!==config.appId||g.expires_at*1000<=Date.now()||!Number.isFinite(g.expires_at)||!['instagram_basic','instagram_content_publish'].every(s=>g.scopes?.includes(s)))throw Error('RECONNECT_REQUIRED');
      if(g.data_access_expires_at>0&&g.data_access_expires_at*1000<=Date.now())throw Error('RECONNECT_REQUIRED');
      for(const scope of ['instagram_basic','instagram_content_publish']){const targets=g.granular_scopes?.find(s=>s.scope===scope)?.target_ids;if(targets&&!targets.map(String).includes(account))throw Error('RECONNECT_REQUIRED');}
      const profile=await call(id(account)+'?fields=id,username',token);
      if(profile.id!==account)throw Error('RECONNECT_REQUIRED');
      const limit=await call(account+'/content_publishing_limit?fields=quota_usage,config',token);
      const quota=limit.data?.[0];
      if(!Number.isFinite(quota?.quota_usage)||!Number.isFinite(quota?.config?.quota_total))throw Error('META_INVALID_RESPONSE');
      if(quota.quota_usage>=quota.config.quota_total)throw Error('PUBLISH_LIMIT');
    },
    async create(account,token,videoUrl,caption){return id((await call(id(account)+'/media',token,{media_type:'REELS',video_url:videoUrl,caption,share_to_feed:'true'})).id);},
    async status(container,token){const value=(await call(id(container)+'?fields=status_code',token)).status_code;if(!['IN_PROGRESS','FINISHED','PUBLISHED','ERROR','EXPIRED'].includes(value))throw Error('META_INVALID_RESPONSE');return value;},
    async publish(account,token,container){const data=await call(id(account)+'/media_publish',token,{creation_id:id(container)});return {mediaId:id(data.id),warning:Boolean(data.config_issue)};},
    async permalink(mediaId,token){const data=await call(id(mediaId)+'?fields=permalink',token);const url=new URL(data.permalink);if(url.protocol!=='https:'||!['www.instagram.com','instagram.com'].includes(url.hostname)||url.username||url.password)throw Error('META_INVALID_RESPONSE');return url.toString();}
  };
}
