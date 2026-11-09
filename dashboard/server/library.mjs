import {createHmac,timingSafeEqual} from 'node:crypto';
import {canReadMedia} from './media.mjs';

export class LibraryQueryError extends Error {}
function sign(value,secret){
  return createHmac('sha256',secret).update(value).digest('base64url');
}
function cursorFor(row,ownerId,until,expires,secret){
  const value=Buffer.from(JSON.stringify([1,'projects/all',ownerId,until,expires,+row.createdAt,row._id])).toString('base64url');
  return value+'.'+sign(value,secret);
}
function readCursor(cursor,ownerId,now,secret){
  if(typeof cursor!=='string'||cursor.length>2048)throw new LibraryQueryError('INVALID_CURSOR');
  const [value,signature,...extra]=cursor.split('.');
  const expected=sign(value,secret);
  if(extra.length || !signature || signature.length!==expected.length || !/^[A-Za-z0-9_-]+$/.test(signature) ||
     !timingSafeEqual(Buffer.from(signature),Buffer.from(expected)))throw new LibraryQueryError('INVALID_CURSOR');
  let decoded;
  try{decoded=JSON.parse(Buffer.from(value,'base64url').toString())}catch{throw new LibraryQueryError('INVALID_CURSOR')}
  if(!Array.isArray(decoded))throw new LibraryQueryError('INVALID_CURSOR');
  const [version,list,owner,until,expires,time,id]=decoded;
  if(version!==1||list!=='projects/all'||owner!==ownerId||!Number.isSafeInteger(time)||!Number.isSafeInteger(until)||!Number.isSafeInteger(expires)||typeof id!=='string')throw new LibraryQueryError('INVALID_CURSOR');
  if(expires<=now)throw new LibraryQueryError('CURSOR_EXPIRED');
  return {until,expires,time,id};
}
export async function projectPage(store,ownerId,query={},now=new Date(),secret=process.env.BETTER_AUTH_SECRET){
  const limit=query.limit===undefined?20:Number(query.limit);
  if(!Number.isInteger(limit)||limit<1||limit>50||Array.isArray(query.limit)||(query.filter!==undefined&&query.filter!=='all')||query.sort!==undefined)
    throw new LibraryQueryError('INVALID_QUERY');
  const cursor=query.cursor===undefined?null:readCursor(query.cursor,ownerId,+now,secret);
  const until=cursor?.until ?? +now;
  const expires=cursor?.expires ?? +now+15*60*1000;
  const match={ownerId,status:{$nin:['deleted','deleting']},createdAt:{$lte:new Date(until)}};
  if(cursor)match.$or=[{createdAt:{$lt:new Date(cursor.time)}},{createdAt:new Date(cursor.time),_id:{$lt:cursor.id}}];
  const rows=await store.projects.aggregate([
    {$match:match},{$sort:{createdAt:-1,_id:-1}},{$limit:limit+1},
    {$lookup:{from:'jobs',localField:'_id',foreignField:'projectId',pipeline:[
      {$match:{ownerId}},{$sort:{createdAt:-1,_id:-1}},{$limit:1},
      {$project:{state:1,stage:1,cancelRequested:1,artifactId:1}}
    ],as:'jobs'}},
    {$lookup:{from:'artifacts',localField:'jobs.artifactId',foreignField:'_id',pipeline:[
      {$match:{ownerId}},{$project:{state:1,expiresAt:1,ownerId:1}}
    ],as:'media'}},
    {$project:{topic:1,createdAt:1,jobs:1,media:1}}
  ]).toArray();
  const hasMore=rows.length>limit;
  const visible=rows.slice(0,limit);
  const items=visible.map(row=>{
    const job=row.jobs[0],artifact=row.media[0];
    const state=job?.state==='succeeded'?(canReadMedia(artifact,ownerId,now)?'ready':'expired'):(job?.state ?? 'draft');
    return {id:row._id,topic:row.topic,state,stage:job?.stage ?? null,cancelRequested:job?.cancelRequested ?? false,
      jobId:job?._id ?? null,expiresAt:artifact?.expiresAt?.toISOString() ?? null};
  });
  return {items,page:{limit,hasMore,nextCursor:hasMore?cursorFor(visible.at(-1),ownerId,until,expires,secret):null},serverNow:now.toISOString()};
}
