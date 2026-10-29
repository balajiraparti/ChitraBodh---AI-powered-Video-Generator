import 'dotenv/config';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {configuration} from './pipeline';
import {Budget,planVideo,ProviderError} from './providers';
import {makeRun,runPath,saveManifest,purgeRun} from './storage';
const topic=process.argv[2]||'Explain binary search to a beginner using an array and every search operation.';
const draft=process.argv[3]?await readFile(process.argv[3],'utf8'):'';
const manifest=await makeRun('live',true),config=configuration();
const budget=new Budget(async calls=>{manifest.calls=calls;await saveManifest(manifest);});
let feedback=draft?`Review this earlier AI draft: ${draft}. It is too verbose and has too many boxes for a vertical phone video. Independently choose a smaller 3–9 element example needing at least three comparisons. Correct the midpoint rule to floor((low+high)/2). Produce the complete structured lesson within 150–185 words.`:'';
try{
 for(let attempt=0;attempt<3;attempt++){
  try{const plan=await planVideo(topic,config,budget,feedback);const file=path.join(runPath(manifest.id),'plan.json');await writeFile(file,JSON.stringify(plan,null,2));manifest.state='planned';await saveManifest(manifest);console.log(JSON.stringify({file,calls:budget.calls,plan},null,2));break;}
  catch(error){if(error instanceof ProviderError||attempt===2)throw error;feedback=`Correct this validation error and regenerate the full coherent plan: ${error instanceof Error?error.message:'invalid plan'}`;console.log(feedback);feedback+=` Previous candidate to repair: ${JSON.stringify((error as any).candidate??{}).slice(0,18000)}`;}
 }
}catch(error){await purgeRun(manifest.id);throw error;}
