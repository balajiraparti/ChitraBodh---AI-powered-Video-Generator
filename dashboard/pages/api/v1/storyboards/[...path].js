import {currentOwner,services} from '../../../../server/auth.mjs';
import {readStoryboard,storyboardCommand,storyboardSchemas} from '../../../../server/storyboards.mjs';
export const config={api:{bodyParser:{sizeLimit:'16kb'}}};
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 try{
  const owner=await currentOwner(req);if(!owner)return res.status(401).json({error:{code:'SIGN_IN_REQUIRED'}});
  const [id,action,...extra]=req.query.path||[];
  if(!id||id.length>128||extra.length||(action&&!storyboardSchemas[action]))return res.status(404).end();
  const store=await services();let result;
  if(req.method==='GET'&&!action)result=await readStoryboard(store,owner,id);
  else if(req.method==='POST'&&action){
   if(req.headers.origin!==store.origin)return res.status(403).end();
   if(req.headers['content-type']?.split(';')[0]!=='application/json')return res.status(415).end();
   result=await storyboardCommand(store,owner,id,action,req.headers['idempotency-key'],req.body);
  }else{res.setHeader('Allow',action?'POST':'GET');return res.status(405).end();}
  if(result.status===429)res.setHeader('Retry-After','60');
  return res.status(result.status).json(result.error?{error:{code:result.error}}:result.data);
 }catch{return res.status(503).json({error:{code:'STORYBOARD_UNAVAILABLE'}});}
}
