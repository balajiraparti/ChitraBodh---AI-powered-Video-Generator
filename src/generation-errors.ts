import {ProviderError} from './providers';

export class GenerationError extends Error {
 constructor(public stage:string,public code:string,message:string){super(message);}
}
export function generationFailure(error:unknown,stage:string):Error{
 if(error instanceof ProviderError||error instanceof GenerationError)return error;
 const message=error instanceof Error?error.message:'';
 if(/already running/.test(message))return new GenerationError(stage,'BUSY','Another video is already generating. Wait for it to finish.');
 if(/Set (?:GEMINI|NVIDIA|ELEVENLABS)_/.test(message))return new GenerationError(stage,'CONFIGURATION','A required provider key or model setting is missing in .env.');
 if(error instanceof Error&&/AbortError|TimeoutError/.test(error.name))return new GenerationError(stage,'TIMEOUT',`${stage} timed out or was cancelled. Retry when the provider is available.`);
 if(/invalid scene plan|incomplete interaction|no usable plan|budget exhausted/.test(message)&&stage==='Planning scenes')return new GenerationError(stage,'STORYBOARD_INVALID','The storyboard AI could not produce a valid storyboard within the request limit. The script length or animation instructions failed validation; this is not an API-key error.');
 if(/duration and request budgets/.test(message))return new GenerationError(stage,'DURATION_INVALID','The voiceover did not reach 40–90 seconds within the retry limit. The script needs a duration correction.');
 if(/alignment|timestamps|spoken characters/.test(message))return new GenerationError(stage,'ALIGNMENT_INVALID','Voiceover timing did not match the script. No out-of-sync video was exported.');
 if(stage==='Rendering video'||stage==='Checking export')return new GenerationError(stage,'RENDER_FAILED',`${stage} failed. Check that Chrome/Edge and FFmpeg are installed and that there is free disk space.`);
 return new GenerationError(stage,'GENERATION_FAILED',`${stage} failed. Retry the video; if this continues, inspect the local diagnostic log for this stage.`);
}
export function publicFailure(error:unknown,stage:string){
 const failure=generationFailure(error,stage);
 return {error:failure.message,stage,code:failure instanceof GenerationError?failure.code:failure instanceof ProviderError?`${failure.provider.toUpperCase()}_${failure.status}`:'GENERATION_FAILED'};
}
