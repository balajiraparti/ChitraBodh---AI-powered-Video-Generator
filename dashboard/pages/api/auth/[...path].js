import { z } from 'zod';
import { services,reserve } from '../../../server/auth.mjs';
import { fromNodeHeaders } from 'better-auth/node';

export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Referrer-Policy','no-referrer');
  const path=req.query.path.join('/');
  try {
    const {auth,origin,limits}=await services();
    if(req.method==='POST' && req.headers.origin!==origin) return res.status(403).end();
    if(req.method==='POST' && path==='email-links') {
      const result=z.email().safeParse(typeof req.body?.email==='string'?req.body.email.trim().toLowerCase():'');
      if(!result.success)return res.status(400).end();
      const email=result.data;
      if(await reserve(limits,'ip:'+req.socket.remoteAddress,30,3600000) &&
         await reserve(limits,'minute:'+email,1,60000) && await reserve(limits,'hour:'+email,5,3600000)) {
        try { await auth.api.signInMagicLink({headers:fromNodeHeaders(req.headers),body:{email,callbackURL:'/dashboard',errorCallbackURL:'/sign-in'}}); }
        catch { console.error('Sign-in link delivery or issuance failed'); }
      }
      return res.status(202).json({message:'If this email has access, you’ll receive a sign-in link.'});
    }
    const verify=req.method==='GET' && path==='magic-link/verify';
    const logout=req.method==='POST' && path==='sign-out';
    if(!verify && !logout)return res.status(404).end();
    const url=new URL('/api/auth/'+path,origin);
    if(verify){
      url.searchParams.set('token',String(req.query.token || ''));
      url.searchParams.set('callbackURL','/dashboard');
      url.searchParams.set('errorCallbackURL','/sign-in');
    }
    const response=await auth.handler(new Request(url,{method:req.method,headers:fromNodeHeaders(req.headers)}));
    const cookies=response.headers.getSetCookie();
    if(cookies.length)res.setHeader('Set-Cookie',cookies);
    if(response.headers.has('location'))return res.redirect(303,response.headers.get('location'));
    if(logout && response.ok)return res.redirect(303,'/sign-in');
    return res.status(response.status).end();
  }catch{return res.status(503).json({message:'Sign-in is temporarily unavailable.'});}
}
