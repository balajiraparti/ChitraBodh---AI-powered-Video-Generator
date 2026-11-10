import {currentOwner,services} from '../../../../server/auth.mjs';
import {updatePreferences} from '../../../../server/preferences.mjs';
export default async function handler(req,res){
  res.setHeader('Cache-Control','private, no-store');
  if(req.method!=='PATCH')return res.status(405).end();
  try{
    const owner=await currentOwner(req);
    if(!owner)return res.status(401).end();
    const store=await services();
    if(req.headers.origin!==store.origin)return res.status(403).end();
    const result=await updatePreferences(store.preferences,owner,req.body);
    return res.status(result.status).json(result.data??{});
  }catch{return res.status(503).end();}
}
