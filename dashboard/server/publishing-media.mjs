import {pipeline} from 'node:stream/promises';
import {resolvePublishingMedia} from './publications.mjs';
export async function servePublishingMedia(req,res,store,storageFor,token){
  res.setHeader('Cache-Control','private, no-store');res.setHeader('Referrer-Policy','no-referrer');
  if(!['GET','HEAD'].includes(req.method)){res.statusCode=405;return res.end();}
  const controller=new AbortController(),close=()=>controller.abort();res.once('close',close);let body,timer;
  try{
    const artifact=await resolvePublishingMedia(store,token);if(!artifact){res.statusCode=404;return res.end();}
    timer=setTimeout(()=>{controller.abort();res.destroy()},Math.max(1,+artifact.expiresAt-Date.now()));
    const storage=storageFor(artifact),meta=await storage.head(artifact.objectKey,controller.signal),size=meta.ContentLength;
    if(!Number.isSafeInteger(size)||size<=0)throw Error('INVALID_SIZE');
    const range=req.headers.range;let start=0,end=size-1;
    if(range){
      const match=/^bytes=(\d*)-(\d*)$/.exec(range);
      if(!match||(!match[1]&&!match[2])){res.statusCode=416;res.setHeader('Content-Range',`bytes */${size}`);return res.end();}
      if(!match[1]){const suffix=Number(match[2]);if(!Number.isSafeInteger(suffix)||suffix<=0){res.statusCode=416;res.setHeader('Content-Range',`bytes */${size}`);return res.end();}start=Math.max(0,size-suffix);}
      else{start=Number(match[1]);end=match[2]?Math.min(Number(match[2]),size-1):size-1;}
      if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=size){res.statusCode=416;res.setHeader('Content-Range',`bytes */${size}`);return res.end();}
    }
    if(!await resolvePublishingMedia(store,token)){res.statusCode=404;return res.end();}
    res.setHeader('Content-Type','video/mp4');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Accept-Ranges','bytes');
    res.setHeader('Content-Length',end-start+1);if(range){res.statusCode=206;res.setHeader('Content-Range',`bytes ${start}-${end}/${size}`);}
    if(req.method==='HEAD')return res.end();
    const object=await storage.get(artifact.objectKey,range?`bytes=${start}-${end}`:undefined,controller.signal);body=object.Body;
    if(!await resolvePublishingMedia(store,token)){body.destroy();res.removeHeader('Content-Length');res.removeHeader('Content-Range');res.statusCode=404;return res.end();}
    await pipeline(body,res);
  }catch{body?.destroy();if(res.headersSent||res.destroyed)return res.destroy();res.removeHeader('Content-Length');res.removeHeader('Content-Range');res.statusCode=503;res.end();}
  finally{clearTimeout(timer);res.removeListener('close',close);}
}
