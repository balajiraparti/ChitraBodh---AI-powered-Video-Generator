import {currentOwner,services} from '../../../../server/auth.mjs';
import {cancelJob} from '../../../../server/jobs.mjs';
import {receipt} from '../../../../server/generations.mjs';
export default async function handler(req,res){
  res.setHeader('Cache-Control','private, no-store');
  if(!['GET','DELETE'].includes(req.method))return res.status(405).end();
  try{
    const ownerId=await currentOwner(req);
    if(!ownerId)return res.status(401).end();
    const store=await services();
    if(req.method==='DELETE'){
      if(req.headers.origin!==store.origin)return res.status(403).end();
      const cancelled=await cancelJob(store,ownerId,String(req.query.id));
      return cancelled?res.status(202).json(receipt(cancelled)):res.status(404).end();
    }
    const job=await store.jobs.findOne({_id:String(req.query.id),ownerId});
    return job?res.json(receipt(job)):res.status(404).end();
  }catch{return res.status(503).end();}
}
