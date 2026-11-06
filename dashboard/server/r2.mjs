import {S3Client,PutObjectCommand,GetObjectCommand,DeleteObjectCommand} from '@aws-sdk/client-s3';
import {createReadStream} from 'node:fs';
import {stat} from 'node:fs/promises';
let cached;
export function objectStorage(){
  if(cached)return cached;
  const {R2_ACCOUNT_ID,R2_ACCESS_KEY_ID,R2_SECRET_ACCESS_KEY,R2_BUCKET}=process.env;
  if(!R2_ACCOUNT_ID||!R2_ACCESS_KEY_ID||!R2_SECRET_ACCESS_KEY||!R2_BUCKET)throw Error('R2 configuration is required');
  if(!/^[a-f0-9]{32}$/i.test(R2_ACCOUNT_ID))throw Error('Invalid R2 account');
  const client=new S3Client({region:'auto',endpoint:'https://'+R2_ACCOUNT_ID+'.r2.cloudflarestorage.com',
    credentials:{accessKeyId:R2_ACCESS_KEY_ID,secretAccessKey:R2_SECRET_ACCESS_KEY},maxAttempts:3,
    requestHandler:{requestTimeout:120000,connectionTimeout:10000}});
  cached={
    async put(key,file,signal){
      const info=await stat(file);
      await client.send(new PutObjectCommand({Bucket:R2_BUCKET,Key:key,Body:createReadStream(file),ContentLength:info.size,ContentType:'video/mp4',CacheControl:'private, no-store'}),{abortSignal:signal});
      return info.size;
    },
    get:(key,range,signal)=>client.send(new GetObjectCommand({Bucket:R2_BUCKET,Key:key,Range:range}),{abortSignal:signal}),
    remove:key=>client.send(new DeleteObjectCommand({Bucket:R2_BUCKET,Key:key}))
  };
  return cached;
}
