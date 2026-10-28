import {mkdir,readFile,writeFile,rename,readdir,rm,open,lstat} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';

export const RUNS=path.resolve(process.env.CHITRABODH_RUNS_DIR||'.local-runs');
export const RETENTION_MS=2*60*60*1000;
export const JOB_LIMIT_MS=20*60*1000;
export type Manifest={id:string;mode:'demo'|'live';state:string;createdAt:number;readyAt?:number;expiresAt:number;calls?:{gemini:number;elevenlabs:number};duration?:number;error?:string;captions:boolean};
export function runPath(id:string){if(!/^[0-9a-f-]{36}$/.test(id))throw new Error('Invalid run ID.');return path.join(RUNS,id);}
export async function saveManifest(manifest:Manifest) {const dest=path.join(runPath(manifest.id),'manifest.json');const temp=dest+'.'+randomUUID()+'.tmp';await writeFile(temp,JSON.stringify(manifest,null,2));await rename(temp,dest);}
export async function readManifest(id:string):Promise<Manifest>{return JSON.parse(await readFile(path.join(runPath(id),'manifest.json'),'utf8'));}
export async function makeRun(mode:Manifest['mode'],captions:boolean):Promise<Manifest>{await mkdir(RUNS,{recursive:true});const manifest:Manifest={id:randomUUID(),mode,state:'queued',createdAt:Date.now(),expiresAt:Date.now()+JOB_LIMIT_MS,captions};await mkdir(runPath(manifest.id));await saveManifest(manifest);return manifest;}
export async function assertAvailable(id:string,now=Date.now()){const manifest=await readManifest(id);if(manifest.state!=='ready'||now>=manifest.expiresAt)throw new Error('Media is not ready or has expired.');return manifest;}
export async function purgeRun(id:string) {
  const target=runPath(id);if(!target.startsWith(RUNS+path.sep))throw new Error('Unsafe cleanup path.');
  const info=await lstat(target).catch(()=>null);if(info?.isSymbolicLink())throw new Error('Refusing to follow a run symlink.');
  await rm(target,{recursive:true,force:true});
}
export async function cleanup(now=Date.now()) {
  await mkdir(RUNS,{recursive:true});const removed:string[]=[];
  for(const entry of await readdir(RUNS,{withFileTypes:true})) {
    if(!entry.isDirectory()||!/^[0-9a-f-]{36}$/.test(entry.name))continue;
    let expired=false;
    try {const m=await readManifest(entry.name);expired=!Number.isFinite(m.expiresAt)||now>=m.expiresAt;}catch{const info=await lstat(runPath(entry.name));expired=now-info.mtimeMs>JOB_LIMIT_MS;}
    if(expired){await purgeRun(entry.name);removed.push(entry.name);}
  }
  return removed;
}
export async function acquireLock():Promise<()=>Promise<void>> {
  await mkdir(RUNS,{recursive:true});const lockPath=path.join(RUNS,'generation.lock');
  for(let attempt=0;attempt<2;attempt++){
    try{const file=await open(lockPath,'wx');await file.writeFile(JSON.stringify({pid:process.pid}));await file.close();return async()=>{await rm(lockPath,{force:true});};}
    catch(error:any){if(error.code!=='EEXIST')throw error;
      const lock=await readFile(lockPath,'utf8').then(JSON.parse).catch(()=>null);
      if(!lock?.pid)throw new Error('Generation lock is incomplete. Check for an active process before removing .local-runs/generation.lock.');
      try{process.kill(lock.pid,0);throw new Error('One generation is already running. Wait for it to finish.');}catch(e:any){if(e.code!=='ESRCH')throw e;}
      await rm(lockPath,{force:true});
    }
  }throw new Error('Could not acquire generation lock.');
}
