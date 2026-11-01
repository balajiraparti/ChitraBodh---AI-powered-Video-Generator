import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {Budget,planVideo,ProviderError,type ProviderConfig} from '../src/providers';
import {demoPlan} from '../src/fixtures';

test('NVIDIA uses bearer-auth chat completions and shares the storyboard validators and budget',async()=>{
 let mode='ok';const requests:any[]=[];
 const server=createServer(async(req,res)=>{
  let raw='';for await(const part of req)raw+=part;
  requests.push({url:req.url,headers:req.headers,body:JSON.parse(raw)});res.setHeader('Content-Type','application/json');
  if(mode==='denied'){res.writeHead(401).end(JSON.stringify({error:{message:'private-provider-payload'}}));return;}
  if(mode==='redact'){res.writeHead(400).end(JSON.stringify({error:{message:'Rejected secret-nvidia and Bearer secret-nvidia'}}));return;}
  res.end(JSON.stringify({choices:[{finish_reason:mode==='truncated'?'length':'stop',message:{content:mode==='invalid'?'{}':JSON.stringify(demoPlan),reasoning_content:'must never be treated as JSON'}}]}));
 });
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 const config:ProviderConfig={storyboardProvider:'nvidia',nvidiaKey:'secret-nvidia',nvidiaModel:'nvidia/test-model',nvidiaBase:`http://127.0.0.1:${(server.address() as {port:number}).port}/v1`,geminiKey:'',geminiModel:'unused',elevenKey:'unused',voiceId:'unused',voiceModel:'unused'};
 try{
  const budget=new Budget();const plan=await planVideo('water cycle',config,budget);
  assert.equal(plan.title,demoPlan.title);assert.equal(budget.calls.nvidia,1);assert.equal(budget.calls.gemini,0);
  const request=requests[0];assert.equal(request.url,'/v1/chat/completions');assert.equal(request.headers.authorization,'Bearer secret-nvidia');assert.equal(request.body.model,config.nvidiaModel);assert.equal(request.body.stream,false);assert.equal(request.body.response_format.type,'json_schema');assert.equal(request.body.messages[1].role,'user');assert.ok(request.body.response_format.json_schema.schema.properties.scenes.items.required.includes('illustration'));
  mode='invalid';await assert.rejects(()=>planVideo('water cycle',config,new Budget()),/NVIDIA returned an invalid scene plan/);
  mode='truncated';await assert.rejects(()=>planVideo('water cycle',config,new Budget()),/truncated/);
  mode='denied';const before=requests.length;await assert.rejects(()=>planVideo('water cycle',config,new Budget()),e=>e instanceof ProviderError&&e.provider==='NVIDIA'&&e.status===401&&!e.message.includes('private-provider-payload'));assert.equal(requests.length,before+1);
  mode='redact';await assert.rejects(()=>planVideo('water cycle',config,new Budget()),e=>e instanceof Error&&!e.message.includes('secret-nvidia'));
  const cap=new Budget();for(let i=0;i<3;i++)await cap.take('gemini');await cap.take('nvidia');await assert.rejects(()=>cap.take('nvidia'),/budget exhausted/);
 }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
