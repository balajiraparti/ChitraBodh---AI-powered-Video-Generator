// Prefer a full explanation; accept a concise lesson without padding or speeding audio.
export const MIN_VIDEO_SECONDS=40;
export const MAX_VIDEO_SECONDS=90;
export const MAX_NARRATION_SECONDS=89.8;
export const TARGET_VIDEO_SECONDS=75;
export const MIN_SCRIPT_WORDS=100;
export const MAX_SCRIPT_WORDS=240;
export const narrationDurationAccepted=(seconds:number)=>Number.isFinite(seconds)&&seconds>=MIN_VIDEO_SECONDS&&seconds<=MAX_NARRATION_SECONDS;
export const SCRIPT_SYSTEM_INSTRUCTION='You write complete educational video scripts and structured visual storyboards. Aim for 60–90 seconds of natural narration, preferably about 190–210 spoken words. Expand short drafts with an explanation of why each step happens, one concrete example, and a useful recap. Do not add filler, repeat sentences, pad silence, or invent facts. Prefer four scenes of about 45–55 words each. A clear shorter lesson is acceptable: 40–90 seconds is the supported range, and 100–240 narration words pass preflight. Actual recorded duration is authoritative. Write narration first, then copy exact phrases from it into animation cues. Return only the requested JSON schema. Preserve valid visual choices during repairs.';
