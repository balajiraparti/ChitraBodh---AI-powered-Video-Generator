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
    if(req.method==='POST' && (path==='sign-up' || path==='sign-in')) {
      const email=z.email().safeParse(typeof req.body?.email==='string'?req.body.email.trim().toLowerCase():'');
      const password=typeof req.body?.password==='string' ? req.body.password : '';
      if(!email.success || password.length<12 || password.length>128)return res.status(400).json({message:'Enter a valid email and a password between 12 and 128 characters.'});
      if(!await reserve(limits,'ip:'+req.socket.remoteAddress,30,3600000) || !await reserve(limits,'hour:'+email.data,10,3600000)) return res.status(429).json({message:'Please wait before trying again.'});
      const result=path==='sign-up'
        ? await auth.api.signUpEmail({headers:fromNodeHeaders(req.headers),body:{email:email.data,password,name:email.data.split('@')[0]},asResponse:true})
        : await auth.api.signInEmail({headers:fromNodeHeaders(req.headers),body:{email:email.data,password},asResponse:true});
      const cookies=result.headers?.getSetCookie?.() || [];
      if(cookies.length)res.setHeader('Set-Cookie',cookies);
      return res.status(200).json({redirect:'/dashboard'});
    }
    const logout=req.method==='POST' && path==='sign-out';
    if(!logout)return res.status(404).end();
    const url=new URL('/api/auth/'+path,origin);
    const response=await auth.handler(new Request(url,{method:req.method,headers:fromNodeHeaders(req.headers)}));
    const cookies=response.headers.getSetCookie();
    if(cookies.length)res.setHeader('Set-Cookie',cookies);
    if(response.headers.has('location'))return res.redirect(303,response.headers.get('location'));
    if(logout && response.ok)return res.redirect(303,'/sign-in');
    return res.status(response.status).end();
  }catch{return res.status(503).json({message:'Sign-in is temporarily unavailable.'});}
}
