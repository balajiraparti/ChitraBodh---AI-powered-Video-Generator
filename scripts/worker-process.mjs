import {fork,spawn} from 'node:child_process';
import {safeDiagnostic,failureMessages} from './generation-diagnostics.mjs';

export function executePipeline(options,onStage,onChild,signal,childModule=new URL('./generation-child.mjs',import.meta.url)){
  return new Promise((resolve,reject)=>{
    const child=fork(childModule,[],{
      execArgv:['--import','tsx'],stdio:['ignore','ignore','ignore','ipc'],detached:process.platform!=='win32'
    });
    let started = false;
    const heartbeat = setInterval(() => {
      if (started && child.connected && !signal.aborted) child.send({type:'heartbeat'}, () => {});
    }, 1000);
    let result;
    let failed=false;
    let diagnostic;
    const validations=[];
    let killTimer;
    let termination=Promise.resolve(true);
    let progress=Promise.resolve();
    function stop(){
      if(child.connected)child.send({type:'cancel'});
      killTimer ??= setTimeout(()=>{
        if(process.platform==='win32')termination=new Promise(done=>{
          const killer=spawn('taskkill',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});
          killer.once('error',()=>done(false));killer.once('close',code=>done(code===0));
        });
        else {try{process.kill(-child.pid,'SIGKILL');}catch{}}
      },10000);
    }
    signal.addEventListener('abort',stop,{once:true});
    child.on('message',message=>{
      if(message.type==='stage')progress=progress.then(()=>onStage(message.stage,message.percent)).catch(()=>{failed=true;stop();});
      if(message.type==='diagnostic' && ['repeated_scene_objects','object_layout','missing_motion','scene_opening','narration_cue','script_length','request_budget','scene_schema','planning_validation'].includes(message.category) && validations.length<4)validations.push(message.category);
      if(message.type==='failed')diagnostic=safeDiagnostic(message.diagnostic,message.diagnostic?.stage);
      if(message.type==='result')result=message.manifest;
    });
    child.on('error',()=>{failed=true;});
    child.on('exit',async code=>{
      clearInterval(heartbeat);
      clearTimeout(killTimer);
      signal.removeEventListener('abort',stop);
      await progress;
      if(!await termination){reject(Object.assign(Error('Process tree termination unconfirmed'),{unsafeToRelease:true}));return;}
      if(failed||signal.aborted||code!==0||!result)reject(Object.assign(Error(failureMessages[diagnostic?.code] || 'Generation stopped'), {diagnostic:diagnostic ? {...diagnostic,validations} : undefined}));
      else resolve(result);
    });
    Promise.resolve(onChild(child.pid)).then(()=>{
      if(signal.aborted){stop();return;}
      child.send({type:'start',options});
      started = true;
    }).catch(()=>{failed=true;stop();});
  });
}
