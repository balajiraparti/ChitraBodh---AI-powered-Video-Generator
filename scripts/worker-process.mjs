import {fork,spawn} from 'node:child_process';

export function executePipeline(options,onStage,onChild,signal,childModule=new URL('./generation-child.mjs',import.meta.url)){
  return new Promise((resolve,reject)=>{
    const child=fork(childModule,[],{
      execArgv:['--import','tsx'],stdio:['ignore','ignore','ignore','ipc'],detached:process.platform!=='win32'
    });
    let result;
    let failed=false;
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
      if(message.type==='stage')progress=progress.then(()=>onStage(message.stage)).catch(()=>{failed=true;stop();});
      if(message.type==='result')result=message.manifest;
    });
    child.on('error',()=>{failed=true;});
    child.on('exit',async code=>{
      clearTimeout(killTimer);
      signal.removeEventListener('abort',stop);
      await progress;
      if(!await termination){reject(Object.assign(Error('Process tree termination unconfirmed'),{unsafeToRelease:true}));return;}
      if(failed||signal.aborted||code!==0||!result)reject(Error('Generation stopped'));
      else resolve(result);
    });
    Promise.resolve(onChild(child.pid)).then(()=>{
      if(signal.aborted){stop();return;}
      child.send({type:'start',options});
    }).catch(()=>{failed=true;stop();});
  });
}
