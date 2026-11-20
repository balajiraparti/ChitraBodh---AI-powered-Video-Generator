import {fromNodeHeaders} from 'better-auth/node';
import {services,reserve} from '../../../../server/auth.mjs';
import {instagramConfig,safeConnection,beginInstagram,finishInstagram,disconnectInstagram} from '../../../../server/instagram.mjs';

export default async function handler(req,res){
  res.setHeader('Cache-Control','private, no-store');
  res.setHeader('Referrer-Policy','no-referrer');
  const action=req.query.action;
  const methods={connect:['POST'],connection:['GET','DELETE'],callback:['GET']};
  if(!methods[action]?.includes(req.method))return res.status(405).end();
  try{
    const store=await services();
    const session=await store.auth.api.getSession({headers:fromNodeHeaders(req.headers)});
    if(!session)return action==='callback'?res.redirect(303,'/sign-in'):res.status(401).json({code:'UNAUTHENTICATED'});
    const owner=session.user.id;
    if(req.method!=='GET'&&req.headers.origin!==store.origin)return res.status(403).end();
    if(action==='connection'&&req.method==='GET'){
      let configured=true;try{instagramConfig();}catch{configured=false;}
      return res.json({configured,connection:safeConnection(await store.instagramConnections.findOne({_id:owner}))});
    }
    if(action==='connection'){
      if(Object.keys(req.body??{}).some(k=>k!=='expectedRevision'))return res.status(400).end();
      const ok=await disconnectInstagram(store.instagramConnections,owner,req.body?.expectedRevision);
      return res.status(ok?200:409).json(ok?{connection:null}:{code:'CONNECTION_CHANGED'});
    }
    const config=instagramConfig();
    if(action==='connect'){
      if(Object.keys(req.body??{}).some(k=>k!=='returnPath')||(req.body?.returnPath&&req.body.returnPath!=='/settings'))return res.status(400).end();
      if(!await reserve(store.limits,`instagram:${owner}`,6,60000))return res.status(429).json({code:'RATE_LIMITED'});
      return res.json(await beginInstagram(store.instagramConnections,owner,session.session.id,config));
    }
    const outcome=await finishInstagram(store.instagramConnections,owner,session.session.id,req.query,config);
    return res.redirect(303,`/settings?instagram=${outcome}`);
  }catch{
    if(action==='callback')return res.redirect(303,'/settings?instagram=failed');
    return res.status(503).json({code:'INSTAGRAM_UNAVAILABLE'});
  }
}
