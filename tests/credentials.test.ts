import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {resolveCredentials} from '../src/credentials';
import {Budget,narrate,ProviderError} from '../src/providers';
import {demoPlan,fixtureAlignment} from '../src/fixtures';

test('current local keys override stale process keys and preserve backup order',()=>{
 assert.deepEqual(resolveCredentials({GEMINI_API_KEY:'stale',ELEVENLABS_API_KEY:'stale-voice'},
 {GEMINI_API_KEY:'current',ELEVEN_LABS_API_KEY:'original',ELEVEN_LABS_BACKUP_API_KEY:'backup',ELEVEN_LABS_BACKUP_API_KEY_NEW:'new'}),
 {geminiKey:'current',nvidiaKey:'',elevenKey:'original',elevenFallbackKeys:['backup','new']});
});
test('503 explains service unavailability rather than incorrect credentials',()=>{
 const error=new ProviderError('Gemini',503);assert.match(error.message,/temporarily unavailable/);assert.doesNotMatch(error.message,/credentials|quota|voice/);
});
test('ElevenLabs backups run only for explicit exhausted credits, within the shared budget',async()=>{
 let failure='quota_exceeded',successfulKey='new';const seen:string[]=[];
 const server=createServer(async(req,res)=>{
  for await(const _ of req){};
  const key=String(req.headers['xi-api-key']);seen.push(key);res.setHeader('Content-Type','application/json');
  if(key!==successfulKey){res.writeHead(401).end(JSON.stringify({detail:{status:failure}}));return;}
  res.end(JSON.stringify({audio_base64:Buffer.alloc(128).toString('base64'),alignment:fixtureAlignment()}));
 });
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 const config={geminiKey:'unused',geminiModel:'unused',elevenKey:'original',elevenFallbackKeys:['backup','new'],voiceId:'test',voiceModel:'test',elevenBase:`http://127.0.0.1:${(server.address() as {port:number}).port}`};
 try{
  const budget=new Budget();await narrate(demoPlan,config,budget);assert.deepEqual(seen,['original','backup','new']);assert.equal(budget.calls.elevenlabs,3);
  seen.length=0;successfulKey='backup';const retryBudget=new Budget();await narrate(demoPlan,config,retryBudget);await narrate(demoPlan,config,retryBudget);assert.deepEqual(seen,['original','backup','backup']);assert.equal(retryBudget.calls.elevenlabs,3);
  for(failure of ['invalid_api_key','payment_required','rate_limit_exceeded']){seen.length=0;await assert.rejects(()=>narrate(demoPlan,config,new Budget()));assert.deepEqual(seen,['original']);}
 }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
