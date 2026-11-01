import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {Budget,planVideo,interactionText,type ProviderConfig} from '../src/providers';
import {demoPlan} from '../src/fixtures';

test('Interactions uses JSON schema, no server storage and existing validation',async()=>{
 let body:any,url='',key='';let invalid=false;
 const server=createServer(async(req,res)=>{
  let raw='';for await(const chunk of req)raw+=chunk;body=JSON.parse(raw);url=req.url!;key=String(req.headers['x-goog-api-key']);
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify({status:'completed',steps:[{type:'thought',text:'not the answer'},{type:'model_output',content:[{type:'text',text:invalid?'{}':JSON.stringify(demoPlan)}]}]}));
 });
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 const config:ProviderConfig={geminiApi:'interactions',geminiKey:'test',geminiModel:'test-model',geminiBase:`http://127.0.0.1:${(server.address() as {port:number}).port}/v1beta`,elevenKey:'unused',voiceId:'unused',voiceModel:'unused'};
 try{
  const budget=new Budget();const plan=await planVideo('water cycle',config,budget);
  assert.equal(plan.title,demoPlan.title);assert.equal(url,'/v1beta/interactions');assert.equal(key,'test');assert.match(body.system_instruction,/60–90 seconds/);assert.match(body.system_instruction,/40–90 seconds/);assert.equal(body.store,false);assert.equal(body.stream,false);
  assert.equal(body.response_format.type,'text');assert.equal(body.response_format.mime_type,'application/json');assert.ok(body.response_format.schema.properties.scenes.items.required.includes('illustration'));assert.equal(budget.calls.gemini,1);assert.equal(budget.calls.nvidia,0);
  invalid=true;await assert.rejects(()=>planVideo('water cycle',config,new Budget()),/invalid scene plan/);
 }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
test('Interactions ignores thoughts and refuses incomplete or nontext results',()=>{
 for(const status of ['in_progress','failed','incomplete','requires_action',undefined])assert.throws(()=>interactionText({status,steps:[{type:'model_output',content:[{type:'text',text:'{}'}]}]}),/incomplete/);
 assert.throws(()=>interactionText({status:'completed',steps:[{type:'thought',text:'{}'}]}),/no usable plan/);
 assert.throws(()=>interactionText({status:'completed',steps:[{type:'model_output',content:[{type:'image',data:'bad'}]}]}),/no usable plan/);
 assert.equal(interactionText({status:'completed',steps:[{type:'model_output',content:[{type:'text',text:'old'}]},{type:'thought',text:'hidden'},{type:'model_output',content:[{type:'text',text:'{'},{type:'text',text:'}'}]}]}),'{}');
});
