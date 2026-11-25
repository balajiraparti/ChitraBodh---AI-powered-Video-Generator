export function deploymentEnvironment(env){
 const origin=env.CHITRABODH_PUBLIC_URL||env.RENDER_EXTERNAL_URL;
 if(!origin)throw Error('Deployment requires a public HTTPS origin');
 const url=new URL(origin);
 if(url.protocol!=='https:'||url.pathname!=='/'||url.search||url.hash||url.username||url.password)throw Error('Deployment origin must be an HTTPS origin without a path');
 return {...env,BETTER_AUTH_URL:url.origin,INSTAGRAM_REDIRECT_URI:url.origin+'/api/v1/instagram/callback'};
}
export function deploymentCommand(role,port='10000'){
 if(role==='web'){
  if(!/^\d+$/.test(port)||Number(port)<1||Number(port)>65535)throw Error('Invalid listening port');
  return ['node_modules/next/dist/bin/next','start','dashboard','--hostname','0.0.0.0','--port',port];
 }
 const entries={generation:['scripts/generation-worker.mjs'],storyboard:['scripts/storyboard-worker.mjs'],publishing:['scripts/publishing-worker.mjs'],cleanup:['scripts/media-cleanup.mjs','--once']};
 if(!entries[role])throw Error('Unknown deployment process');
 return ['--import','tsx',...entries[role]];
}
