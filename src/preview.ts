import {createServer} from 'node:http';
import {createReadStream} from 'node:fs';
import {readdir,stat} from 'node:fs/promises';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {creatorForm} from './portal';
import {isSupportedVoice} from './voices';
import {generate} from './pipeline';
import {ProviderError} from './providers';
import {RUNS,assertAvailable,cleanup,runPath} from './storage';
export async function preview(port=4173,runGeneration:typeof generate=generate){
 await cleanup();
 const token=randomBytes(32).toString('hex');
 let job:{busy:boolean;state:string;error?:string}={busy:false,state:'idle'};
 const timer=setInterval(()=>{void cleanup().catch(()=>console.error('Cleanup failed; run npm run cleanup.'));},60_000);
 const server=createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  const localHost=`127.0.0.1:${(server.address() as {port:number})?.port}`;
  if(req.headers.host!==localHost&&req.headers.host!==localHost.replace('127.0.0.1','localhost')){res.writeHead(403).end('Invalid host');return;}
  try{
   const url=new URL(req.url||'/',`http://127.0.0.1:${port}`);
   if(url.pathname==='/api/generation'&&req.method==='GET'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(job));return;}
   if(url.pathname==='/api/generate'&&req.method==='POST'){
    res.setHeader('Content-Type','application/json');
    if(req.headers['x-chitrabodh-token']!==token||req.headers.origin!==`http://${req.headers.host}`){res.writeHead(403).end(JSON.stringify({error:'Reload this local page before generating.'}));return;}
    if(job.busy){res.writeHead(409).end(JSON.stringify({error:'A video is already generating. Please wait.'}));return;}
    let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>8192){res.writeHead(413).end(JSON.stringify({error:'Request too large.'}));return;}}
    let input;try{input=JSON.parse(body);}catch{res.writeHead(400).end(JSON.stringify({error:'Invalid JSON.'}));return;}
    if(!input||typeof input.topic!=='string'||!input.topic.trim()||input.topic.length>1000||!isSupportedVoice(input.voice)||typeof input.captions!=='boolean'){res.writeHead(400).end(JSON.stringify({error:'Enter a topic, choose one of the two voices, and set captions.'}));return;}
    job={busy:true,state:'Starting generation'};
    void runGeneration({demo:false,topic:input.topic.trim(),voice:input.voice,captions:input.captions,onProgress:state=>{job.state=state;}}).then(()=>{job={busy:false,state:'ready'};}).catch(error=>{job={busy:false,state:'failed',error:error instanceof ProviderError?error.message:'Generation could not finish. Check the local terminal and provider configuration, then retry.'};console.error(error instanceof Error?error.message:'Generation failed');});
    res.writeHead(202).end(JSON.stringify({accepted:true}));return;
   }
   if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405).end();return;}
   if(url.pathname==='/'){
    const cards:string[]=[];
    for(const id of await readdir(RUNS)){
     try{const m=await assertAvailable(id);cards.push(`<article><p>${m.mode==='demo'?'OFFLINE DEMO — silent, authored sample':'AI-generated video'} · ${m.duration?.toFixed(1)} seconds</p><video controls preload="metadata" poster="/media/${id}/thumbnail.png" src="/media/${id}/video.mp4"></video><p>Expires ${new Date(m.expiresAt).toLocaleString()}</p><a href="/media/${id}/video.mp4" download="chitrabodh.mp4">Download MP4</a></article>`);}catch{}
    }
    res.setHeader('Content-Type','text/html; charset=utf-8');res.end(`<!doctype html><html><head><title>ChitraBodh · Create a video</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{background:#f6f5ee;color:#142b36;font:17px Arial;margin:40px auto;max-width:1000px;padding:0 24px}h1{font-size:42px}small,a{color:#147c72}main{display:flex;gap:30px;flex-wrap:wrap}article{background:white;padding:24px;border-radius:20px}video{display:block;width:300px;max-width:100%;border-radius:12px}p{max-width:340px;line-height:1.5}</style></head><body><small>LOCAL PROTOTYPE</small><h1>ChitraBodh</h1><p>Ideas, explained through motion.</p>${creatorForm(token)}<h2>Your videos</h2><p>Media expires two hours after completion. Keep this server running for cleanup. Downloaded copies remain on your device.</p><main>${cards.join('')||'<p>Your finished videos will appear here.</p>'}</main></body></html>`);return;
   }
   const match=url.pathname.match(/^\/media\/([0-9a-f-]{36})\/(video\.mp4|thumbnail\.png)$/);
   if(!match){res.writeHead(404).end('Not found');return;}
   await assertAvailable(match[1]);const file=path.join(runPath(match[1]),match[2]);const {size}=await stat(file);
   res.setHeader('Content-Type',match[2].endsWith('.mp4')?'video/mp4':'image/png');res.setHeader('Accept-Ranges','bytes');
   let start=0,end=size-1;const range=req.headers.range;
   if(range){const parts=range.match(/^bytes=(\d+)-(\d*)$/);if(!parts){res.writeHead(416,{'Content-Range':`bytes */${size}`}).end();return;}start=Number(parts[1]);end=parts[2]?Number(parts[2]):end;if(start>end||end>=size){res.writeHead(416,{'Content-Range':`bytes */${size}`}).end();return;}res.statusCode=206;res.setHeader('Content-Range',`bytes ${start}-${end}/${size}`);}
   res.setHeader('Content-Length',end-start+1);if(req.method==='HEAD'){res.end();return;}
   const stream=createReadStream(file,{start,end});stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);
  }catch{if(!res.headersSent)res.writeHead(410).end('Video unavailable or expired.');else res.destroy();}
 });
 server.on('error',error=>{clearInterval(timer);console.error(error.message);process.exitCode=1;});
 server.on('close',()=>{clearInterval(timer);process.removeListener('SIGINT',stop);process.removeListener('SIGTERM',stop);});
 server.listen(port,'127.0.0.1',()=>console.log(`Preview: http://127.0.0.1:${port} — keep running for automatic cleanup.`));
 const stop=()=>{clearInterval(timer);server.close();};process.once('SIGINT',stop);process.once('SIGTERM',stop);
 return server;
}
