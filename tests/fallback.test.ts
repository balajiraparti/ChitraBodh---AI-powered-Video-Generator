import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {Budget,planVideo,ProviderError,type ProviderConfig} from '../src/providers';
import {demoPlan} from '../src/fixtures';

async function withProvider(status:number,check:(config:ProviderConfig,seen:string[])=>Promise<void>,allFail=false){
 const seen:string[]=[];
 const server=createServer(async(req,res)=>{
  for await(const _ of req){};
  seen.push(req.url!);res.setHeader('Content-Type','application/json');
  if(allFail||req.url!.includes('/primary:')){res.writeHead(status).end(JSON.stringify({error:{status:'TEST_ERROR'}}));return;}
  res.end(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify(demoPlan)}]}}]}));
 });
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 const port=(server.address() as {port:number}).port;
 try{await check({geminiKey:'test',geminiModel:'primary',geminiFallbackModels:['backup'],geminiBase:`http://127.0.0.1:${port}`,elevenKey:'unused',voiceId:'unused',voiceModel:'unused'},seen);}
 finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
}
test('availability and quota failures use backup; repairs do not revisit failed primary',async()=>{
 for(const status of [404,429,500,502,503,504])await withProvider(status,async(config,seen)=>{
  const budget=new Budget();await planVideo('water cycle',config,budget);await planVideo('water cycle',config,budget,'repair');
  assert.equal(seen.length,3);assert.ok(seen[0].includes('/primary:'));assert.ok(seen.slice(1).every(s=>s.includes('/backup:')));
  assert.equal(budget.calls.gemini,3);assert.equal(budget.selectedGeminiModel,'backup');
 });
});
test('authentication and malformed-request errors do not trigger fallback',async()=>{
 for(const status of [400,401,403])await withProvider(status,async(config,seen)=>{
  await assert.rejects(()=>planVideo('water cycle',config,new Budget()),e=>e instanceof ProviderError&&e.status===status);assert.equal(seen.length,1);
 });
});
test('fallback exhaustion and cancellation stop; total request budget remains bounded',async()=>{
 await withProvider(503,async(config,seen)=>{
  await assert.rejects(()=>planVideo('water cycle',config,new Budget()),e=>e instanceof ProviderError&&e.status===503);assert.equal(seen.length,2);
 },true);
 await withProvider(503,async(config,seen)=>{
  const budget=new Budget();for(let i=0;i<3;i++)await budget.take('gemini');
  await assert.rejects(()=>planVideo('water cycle',config,budget),/budget exhausted/);assert.equal(seen.length,1);assert.equal(budget.calls.gemini,4);
  await assert.rejects(()=>planVideo('water cycle',config,new Budget(),'',AbortSignal.abort()));assert.equal(seen.length,1);
 });
});
