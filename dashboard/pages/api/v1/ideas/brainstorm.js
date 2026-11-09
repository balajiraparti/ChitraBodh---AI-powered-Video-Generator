import {currentOwner,services} from '../../../../server/auth.mjs';
import {brainstorm} from '../../../../server/ideas.mjs';

export const config={api:{bodyParser:{sizeLimit:'16kb'}}};
export default async function handler(req,res){
  res.setHeader('Cache-Control','private, no-store');
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).end();}
  try{
    const owner=await currentOwner(req);
    if(!owner)return res.status(401).end();
    const store=await services();
    if(req.headers.origin!==store.origin)return res.status(403).end();
    if(req.headers['content-type']?.split(';')[0]!=='application/json')return res.status(415).end();
    const result=await brainstorm(store,owner,req.headers['idempotency-key'],req.body);
    if(result.retry)res.setHeader('Retry-After',String(result.retry));
    if(result.replayed)res.setHeader('Idempotency-Replayed','true');
    return res.status(result.status).json(result.error?{error:{code:result.error}}:result.data);
  }catch{return res.status(503).json({error:{code:'IDEAS_UNAVAILABLE'}});}
}
