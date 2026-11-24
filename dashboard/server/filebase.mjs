import {S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand} from '@aws-sdk/client-s3';
import {createReadStream, readFileSync} from 'node:fs';
import {stat} from 'node:fs/promises';
import path from 'node:path';
import {parse} from 'dotenv';
import {objectStorage as legacyStorage} from './r2.mjs';

let cached;

export function objectStorage() {
  if (cached) return cached;
  const cwd = process.cwd();
  const root = path.basename(cwd) === 'dashboard' ? path.dirname(cwd) : cwd;
  let local = {};
  try {
    local = parse(readFileSync(path.join(root, '.env')));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const env = {...local, ...process.env};
  const {FILEBASE_ENDPOINT: endpoint, FILEBASE_ACCESS_KEY_ID: accessKeyId,
    FILEBASE_SECRET_ACCESS_KEY: secretAccessKey, FILEBASE_BUCKET: Bucket, REGION: region} = env;
  if (!accessKeyId || !secretAccessKey || !Bucket || !region) throw Error('Filebase credentials, bucket and region are required');
  if (endpoint?.replace(/\/$/, '') !== 'https://s3.filebase.io') throw Error('Invalid Filebase endpoint');
  const client = new S3Client({endpoint, region, credentials:{accessKeyId, secretAccessKey},
    forcePathStyle:true, maxAttempts:3, requestHandler:{requestTimeout:120000, connectionTimeout:10000}});
  cached = {
    async put(Key, file, signal, contentType = 'video/mp4') {
      const {size} = await stat(file);
      const body = createReadStream(file);
      try {
        await client.send(new PutObjectCommand({Bucket, Key, Body:body, ContentLength:size,
          ContentType:contentType, CacheControl:'private, no-store'}), {abortSignal:signal});
      } finally {
        body.destroy();
      }
      return size;
    },
    get:(Key, Range, signal)=>client.send(new GetObjectCommand({Bucket, Key, Range}), {abortSignal:signal}),
    head:(Key,signal)=>client.send(new HeadObjectCommand({Bucket,Key}),{abortSignal:signal}),
    remove:Key=>client.send(new DeleteObjectCommand({Bucket, Key}))
  };
  return cached;
}

// Records created before the Filebase cutover contain only an R2 object key.
export function artifactStorage(artifact) {
  if (artifact.storageProvider === 'filebase') return objectStorage();
  if (artifact.storageProvider == null || artifact.storageProvider === 'r2') return legacyStorage();
  throw Error('Unknown artifact storage provider');
}
