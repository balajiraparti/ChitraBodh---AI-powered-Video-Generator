import {currentOwner,services,reserve} from '../../../../server/auth.mjs';
import {instagramConfig} from '../../../../server/instagram.mjs';
import {publishingOrigin,submitPublication,publicationView} from '../../../../server/publications.mjs';
import {publicationPage} from '../../../../server/publication-list.mjs';
export default async function handler(req,res){
  res.setHeader('Cache-Control','private, no-store');
  try{
    const owner=await currentOwner(req);if(!owner)return res.status(401).end();
    const store=await services(),parts=req.query.path??[];
    if(req.method!=='GET'&&req.headers.origin!==store.origin)return res.status(403).end();
    if(req.method==='GET'&&!parts.length){
      try{return res.json(await publicationPage(store,owner,req.query,process.env.BETTER_AUTH_SECRET));}
      catch(error){if(['INVALID_CURSOR','INVALID_QUERY'].includes(error.message))return res.status(400).json({error:{code:error.message}});throw error;}
    }
    if(req.method==='POST'&&!parts.length){
      instagramConfig();publishingOrigin();
      if(!await reserve(store.limits,'publishing:'+owner,6,60000))return res.status(429).json({error:{code:'RATE_LIMITED'}});
      const result=await submitPublication(store,owner,req.headers['idempotency-key'],req.body);
      return res.status(result.status).json(result.error?{error:{code:result.error},publication:result.data}:result.data);
    }
    if(parts.length===1&&req.method==='GET'){
      const row=await store.publishJobs.findOne({_id:parts[0],ownerId:owner});return row?res.json(publicationView(row)):res.status(404).end();
    }
    if(parts.length===2&&parts[1]==='check'&&req.method==='POST'){
      if(!await reserve(store.limits,'publish-check:'+owner,6,60000))return res.status(429).end();
      const row=await store.publishJobs.findOne({_id:parts[0],ownerId:owner});if(!row)return res.status(404).end();
      // Read-only provider reconciliation is queued; this action NEVER publishes again.
      if(['outcome_unknown','needs_attention'].includes(row.state))await store.publishJobs.updateOne({_id:row._id,state:row.state},{$set:{state:'outcome_unknown',nextRunAt:new Date()}});
      return res.status(202).json(publicationView(await store.publishJobs.findOne({_id:row._id,ownerId:owner})));
    }
    return res.status(405).end();
  }catch{return res.status(503).json({error:{code:'PUBLISHING_UNAVAILABLE'}});}
}
