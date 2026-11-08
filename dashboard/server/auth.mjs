import {database} from './database.mjs';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { createHash } from 'node:crypto';
import { fromNodeHeaders } from 'better-auth/node';
import { makeAuth } from './auth-core.mjs';

let connection;
async function connect() {
  const {MONGODB_URI, BETTER_AUTH_URL, BETTER_AUTH_SECRET} = process.env;
  if (!MONGODB_URI || !BETTER_AUTH_URL || BETTER_AUTH_SECRET?.length < 32 || !BETTER_AUTH_SECRET) throw Error('Auth configuration required');
  const origin = new URL(BETTER_AUTH_URL).origin;
  if (!origin.startsWith('https://') && !['localhost','127.0.0.1'].includes(new URL(origin).hostname)) throw Error('HTTPS required');
  const store=await database();
  const {client,db}=store;
    const auth = makeAuth({database:mongodbAdapter(db,{client}),baseURL:origin,secret:BETTER_AUTH_SECRET});
    return {...store,auth,origin,limits:db.collection('auth_limits')};
}
export function services() {
  return connection ??= connect().catch(error=>{connection=undefined;throw error});
}
// Atomic rolling-window reservation, shared across server processes.
export async function reserve(limits,key,max,ms) {
  const now=new Date(), cutoff=new Date(+now-ms);
  const _id=createHash('sha256').update(key).digest('hex');
  const recent={$filter:{input:{$ifNull:['$hits',[]]},as:'hit',cond:{$gt:['$$hit',cutoff]}}};
  try {
    await limits.updateOne({_id},{$setOnInsert:{hits:[],expiresAt:new Date(+now+ms)}},{upsert:true});
  } catch(error) { if(error.code!==11000) throw error; }
  const result=await limits.updateOne({_id,$expr:{$lt:[{$size:recent},max]}},[
    {$set:{hits:{$concatArrays:[recent,[now]]},expiresAt:new Date(+now+ms)}}
  ]);
  return result.matchedCount===1;
}
export async function currentOwner(req) {
  if (!req.headers.cookie) return null;
  const {auth} = await services();
  const session = await auth.api.getSession({headers:fromNodeHeaders(req.headers)});
  return session?.user.id ?? null;
}
export async function privatePage({req,res}) {
  res.setHeader('Cache-Control','private, no-store');
  if (await currentOwner(req)) return {props:{}};
  return {redirect:{destination:'/sign-in',permanent:false}};
}
