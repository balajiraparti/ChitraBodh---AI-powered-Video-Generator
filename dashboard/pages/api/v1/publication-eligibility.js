import {currentOwner,services} from '../../../server/auth.mjs';
import {safeConnection,instagramConfig} from '../../../server/instagram.mjs';
import {publicationEligibility,publicationView,publishingOrigin} from '../../../server/publications.mjs';
export default async function handler(req,res){
  res.setHeader('Cache-Control','private, no-store');if(req.method!=='GET')return res.status(405).end();
  try{
    const owner=await currentOwner(req);if(!owner)return res.status(401).end();
    const store=await services(),artifactId=req.query.artifactId;
    if(typeof artifactId!=='string'||artifactId.length>128)return res.status(400).end();
    const connection=safeConnection(await store.instagramConnections.findOne({_id:owner}));
    const e=await publicationEligibility(store,owner,artifactId,connection?.id);
    if(e.reason==='MEDIA_NOT_FOUND')return res.status(404).end();
    let configured=true;try{instagramConfig();publishingOrigin();}catch{configured=false;}
    const latest=await store.publishJobs.findOne({ownerId:owner,artifactId},{sort:{createdAt:-1,_id:-1}});
    return res.json({eligible:configured&&!e.reason,reason:configured?e.reason??null:'PUBLISHING_NOT_CONFIGURED',connection,publication:latest?publicationView(latest):null,serverNow:new Date().toISOString()});
  }catch{return res.status(503).json({error:{code:'PUBLISHING_UNAVAILABLE'}});}
}
