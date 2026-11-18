export const failureMessages = {
  STORYBOARD_INVALID:'The AI could not produce a valid storyboard. Your idea is saved.',
  DURATION_INVALID:'The narration did not fit the video duration. Your idea is saved.',
  ALIGNMENT_INVALID:'The narration timing could not be aligned. Your idea is saved.',
  RENDER_FAILED:'The video could not be rendered. Your idea is saved.',
  CONFIGURATION:'A generation provider needs configuration. Your idea is saved.',
  TIMEOUT:'Generation timed out. Your idea is saved.',
  BUSY:'Another local render is running. Your idea is saved.',
  GEMINI_429:'The storyboard provider reached its quota. Try again later.',
  GEMINI_503:'The storyboard provider is temporarily unavailable. Try again later.',
  GEMINI_400:'The storyboard provider rejected the request configuration.',
  GEMINI_401:'The storyboard provider rejected its credentials.',
  GEMINI_403:'The storyboard provider denied access.',
  GEMINI_404:'The configured storyboard model is unavailable.',
  GENERATION_FAILED:'We could not finish this video. Your idea is saved.'
};
export function safeDiagnostic(error, stage) {
  const provider = ['Gemini','ElevenLabs','NVIDIA'].includes(error?.provider) ? error.provider : undefined;
  const status = Number.isInteger(error?.status) && error.status>=400 && error.status<=599 ? error.status : undefined;
  const candidate = provider && status ? provider.toUpperCase()+'_'+status : error?.code;
  const code = Object.hasOwn(failureMessages,candidate) ? candidate : 'GENERATION_FAILED';
  return {code, stage:['Starting generation','Planning scenes','Generating narration','Rendering video','Checking export'].includes(stage)?stage:'Starting generation',
    ...(provider ? {provider} : {}), ...(status ? {status} : {})};
}

export function validationCategory(error) {
  const message = String(error?.message || '');
  const rules = [
    [/same objects|NEW object/, 'repeated_scene_objects'],
    [/overlap|closer than|moves straight through|free space/, 'object_layout'],
    [/meaningful movement/, 'missing_motion'],
    [/empty|start|first action/, 'scene_opening'],
    [/phrase|occurrence/, 'narration_cue'],
    [/word|script length/, 'script_length'],
    [/budget exhausted/, 'request_budget'],
    [/invalid scene plan/, 'scene_schema']
  ];
  return rules.find(([pattern])=>pattern.test(message))?.[1] || 'planning_validation';
}
