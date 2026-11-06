import {pipeline} from 'node:stream/promises';
import {currentOwner,services} from '../../../../server/auth.mjs';
import {objectStorage} from '../../../../server/r2.mjs';
import {canReadMedia} from '../../../../server/media.mjs';
export const config={api:{responseLimit:false}};
export default async function handler(req,res){
  res.setHeader('Cache-Control','private, no-store');
  if(req.method!=='GET')return res.status(405).end();
  const controller=new AbortController();
  const close=()=>controller.abort();
  res.once('close',close);
  let expiryTimer;
  let body;
  try{
    const ownerId=await currentOwner(req);
    if(!ownerId)return res.status(401).end();
    const {artifacts}=await services();
    const artifact=await artifacts.findOne({_id:String(req.query.id),ownerId});
    if(!artifact)return res.status(404).end();
    if(!canReadMedia(artifact,ownerId))return res.status(410).end();
    const range=req.headers.range;
    if(range && !/^bytes=(?:[0-9]+-[0-9]*|-[0-9]+)$/.test(range))return res.status(416).end();
    expiryTimer=setTimeout(()=>{controller.abort();res.destroy();},+new Date(artifact.expiresAt)-Date.now());
    const result=await objectStorage().get(artifact.objectKey,range,controller.signal);
    body=result.Body;
    if(!canReadMedia(artifact,ownerId)){body.destroy();return res.status(410).end();}
    res.setHeader('Content-Type','video/mp4');
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Content-Disposition','inline; filename="chitrabodh.mp4"');
    res.setHeader('Accept-Ranges','bytes');
    if(result.ContentLength!==undefined)res.setHeader('Content-Length',result.ContentLength);
    if(result.ContentRange){res.statusCode=206;res.setHeader('Content-Range',result.ContentRange);}
    await pipeline(body,res);
  }catch(error){
    body?.destroy();
    if(res.headersSent||res.destroyed){res.destroy();return;}
    return res.status(error?.$metadata?.httpStatusCode===416?416:503).end();
  }finally{clearTimeout(expiryTimer);res.removeListener('close',close);}
}
