import {currentOwner,services} from '../../../server/auth.mjs';
import {submitGeneration} from '../../../server/generations.mjs';
export default async function handler(req,res){
  res.setHeader('Cache-Control','private, no-store');
  if(req.method!=='POST')return res.status(405).end();
  try{
    const owner=await currentOwner(req);
    if(!owner)return res.status(401).end();
    const store=await services();
    if(req.headers.origin!==store.origin)return res.status(403).end();
    const result=await submitGeneration(store,owner,req.headers['idempotency-key'],req.body);
    if(result.error)return res.status(result.status).json({error:{code:result.error},job:result.data});
    return res.status(202).json(result.data);
  }catch{return res.status(503).end();}
}
