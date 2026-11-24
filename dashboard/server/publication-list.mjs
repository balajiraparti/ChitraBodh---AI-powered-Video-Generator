import {createHmac,timingSafeEqual} from 'node:crypto';
import {publicationView} from './publications.mjs';
const mac=(text,key)=>createHmac('sha256',key).update(text).digest('base64url');
export async function publicationPage(store,owner,query,secret,now=Date.now()){
  const limit=query.limit===undefined?20:Number(query.limit),artifactId=query.artifactId;
  if(!Number.isInteger(limit)||limit<1||limit>50||Array.isArray(query.limit)||typeof artifactId!=='string'||!artifactId||artifactId.length>128)throw Error('INVALID_QUERY');
  let cursor={until:now,expires:now+900000};
  if(query.cursor!==undefined){
    if(typeof query.cursor!=='string'||query.cursor.length>2048)throw Error('INVALID_CURSOR');
    const [text,signature,...rest]=query.cursor.split('.'),expected=mac(text,secret);
    if(rest.length||!signature||Buffer.byteLength(signature)!==Buffer.byteLength(expected)||!timingSafeEqual(Buffer.from(signature),Buffer.from(expected)))throw Error('INVALID_CURSOR');
    try{cursor=JSON.parse(Buffer.from(text,'base64url'));}catch{throw Error('INVALID_CURSOR');}
    if(cursor.owner!==owner||cursor.artifactId!==artifactId||!Number.isSafeInteger(cursor.until)||!Number.isSafeInteger(cursor.time)||typeof cursor.id!=='string'||!Number.isSafeInteger(cursor.expires)||cursor.expires<=now)throw Error('INVALID_CURSOR');
  }
  const filter={ownerId:owner,artifactId,createdAt:{$lte:new Date(cursor.until)}};
  if(cursor.id)filter.$or=[{createdAt:{$lt:new Date(cursor.time)}},{createdAt:new Date(cursor.time),_id:{$lt:cursor.id}}];
  const rows=await store.publishJobs.find(filter).sort({createdAt:-1,_id:-1}).limit(limit+1).toArray(),hasMore=rows.length>limit,items=rows.slice(0,limit);
  let nextCursor=null;if(hasMore){const last=items.at(-1),text=Buffer.from(JSON.stringify({owner,artifactId,until:cursor.until,expires:cursor.expires,time:+last.createdAt,id:last._id})).toString('base64url');nextCursor=text+'.'+mac(text,secret);}
  return {items:items.map(publicationView),page:{limit,hasMore,nextCursor}};
}
