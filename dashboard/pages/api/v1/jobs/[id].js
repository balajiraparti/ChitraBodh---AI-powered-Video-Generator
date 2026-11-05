import {currentOwner,services} from '../../../../server/auth.mjs';
import {receipt} from '../../../../server/generations.mjs';
export default async function handler(req,res){
  res.setHeader('Cache-Control','private, no-store');
  if(req.method!=='GET')return res.status(405).end();
  try{
    const ownerId=await currentOwner(req);
    if(!ownerId)return res.status(401).end();
    const {jobs}=await services();
    const job=await jobs.findOne({_id:String(req.query.id),ownerId});
    return job?res.json(receipt(job)):res.status(404).end();
  }catch{return res.status(503).end();}
}
