import { MongoClient } from 'mongodb';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import nodemailer from 'nodemailer';
import { createHash } from 'node:crypto';
import { fromNodeHeaders } from 'better-auth/node';
import { makeAuth } from './auth-core.mjs';

let connection;
async function connect() {
  const {MONGODB_URI, BETTER_AUTH_URL, BETTER_AUTH_SECRET, SMTP_URL, AUTH_FROM} = process.env;
  if (!MONGODB_URI || !BETTER_AUTH_URL || !SMTP_URL || !AUTH_FROM || BETTER_AUTH_SECRET?.length < 32 || !BETTER_AUTH_SECRET) throw Error('Auth configuration required');
  const origin = new URL(BETTER_AUTH_URL).origin;
  if (!origin.startsWith('https://') && !['localhost','127.0.0.1'].includes(new URL(origin).hostname)) throw Error('HTTPS required');
  const client = new MongoClient(MONGODB_URI,{serverSelectionTimeoutMS:5000});
  const db = client.db();
  try {
    await Promise.all([
      db.collection('jobs').createIndex({ownerId:1,key:1},{unique:true}),
      db.collection('jobs').createIndex({ownerId:1},{unique:true,partialFilterExpression:{active:true}}),
      db.collection('projects').createIndex({ownerId:1,status:1,updatedAt:-1,_id:-1}),
      db.collection('invites').createIndex({normalizedEmail:1},{unique:true}),
      db.collection('auth_limits').createIndex({expiresAt:1},{expireAfterSeconds:0}),
      ...[['user','email'],['verification','identifier'],['session','token']].map(([name,key]) =>
        db.collection(name).createIndex({[key]:1},{unique:true}))
    ]);
    const invited = async email => Boolean(await db.collection('invites').findOne({normalizedEmail:email.trim().toLowerCase(),enabled:true},{projection:{_id:1}}));
    const mail = nodemailer.createTransport(SMTP_URL);
    const auth = makeAuth({database:mongodbAdapter(db,{client}),baseURL:origin,secret:BETTER_AUTH_SECRET,invited,
      deliver:(to,url)=>mail.sendMail({from:AUTH_FROM,to,subject:'Sign in to Chitrabodh',text:'Your sign-in link is valid for ten minutes:\n'+url})});
    return {auth,invited,origin,client,jobs:db.collection('jobs'),versions:db.collection('versions'),projects:db.collection('projects'),limits:db.collection('auth_limits')};
  } catch(error) { await client.close(); throw error; }
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
  const {auth, invited} = await services();
  const session = await auth.api.getSession({headers:fromNodeHeaders(req.headers)});
  return session && await invited(session.user.email) ? session.user.id : null;
}
export async function privatePage({req,res}) {
  res.setHeader('Cache-Control','private, no-store');
  if (await currentOwner(req)) return {props:{}};
  return {redirect:{destination:'/sign-in',permanent:false}};
}