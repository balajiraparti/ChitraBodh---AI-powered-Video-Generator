import {currentOwner,services} from '../../../../../server/auth.mjs';
import {submitRevision} from '../../../../../server/revisions.mjs';
export default async function handler(req,res){
  res.setHeader('Cache-Control','private, no-store');
  if(req.method!=='POST')return res.status(405).end();
  try{
    const owner=await currentOwner(req);
    if(!owner)return res.status(401).end();
    const store=await services();
    if(req.headers.origin!==store.origin)return res.status(403).end();
    const result=await submitRevision(store,owner,req.query.projectId,req.headers['idempotency-key'],req.body);
    return res.status(result.status).json(result.data??{error:{code:result.error}});
  }catch{return res.status(503).end();}
}
