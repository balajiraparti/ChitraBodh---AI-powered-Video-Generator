import {spawn} from 'node:child_process';
import {deploymentEnvironment,deploymentCommand} from '../deploy/runtime.mjs';
const env=deploymentEnvironment(process.env);
const child=spawn(process.execPath,deploymentCommand(process.argv[2],process.env.PORT||'10000'),{env,stdio:'inherit'});
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>child.kill(signal));
child.on('error',()=>{console.error('Deployment process could not start');process.exitCode=1});
child.on('exit',(code)=>{process.exitCode=code??1});
