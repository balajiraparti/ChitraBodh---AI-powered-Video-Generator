import {findOccurrence,scriptFor,type Alignment,type Plan,type Timeline} from './contracts';

// Canonicalization changes punctuation/spacing only. Spoken number expansions must
// be made explicit in the narration; ambiguous alignment fails closed.
function canonical(text:string):{text:string;offsets:number[]} {
  let output=''; const offsets:number[]=[];
  for(let i=0;i<text.length;) {
    const char=String.fromCodePoint(text.codePointAt(i)!);
    for(const part of char.normalize('NFKC').toLowerCase()) {
      if(/[\p{L}\p{N}]/u.test(part)) {output+=part;for(let j=0;j<part.length;j++) offsets.push(i);}
    }
    i+=char.length;
  }
  return {text:output,offsets};
}
export function buildTimeline(plan:Plan,alignment:Alignment,duration:number):Timeline {
  if(!Number.isFinite(duration)||duration<=0||duration>120) throw new Error('Invalid audio duration.');
  const {characters:c,character_start_times_seconds:s,character_end_times_seconds:e}=alignment;
  if(!Array.isArray(c)||!Array.isArray(s)||!Array.isArray(e)||!c.length||c.length!==s.length||c.length!==e.length) throw new Error('Invalid alignment arrays.');
  const chars:string[]=[]; const starts:number[]=[]; const ends:number[]=[];
  c.forEach((char,i)=>{
    if(typeof char!=='string'||!char.length||!Number.isFinite(s[i])||!Number.isFinite(e[i])||s[i]<0||e[i]<s[i]||e[i]>duration+0.15||(i>0&&(s[i]<s[i-1]||e[i]<e[i-1]))) throw new Error('Invalid alignment timestamps.');
    // Map UTF-16 positions to provider elements, including multi-character elements.
    for(let j=0;j<char.length;j++){chars.push(char[j]);starts.push(s[i]);ends.push(Math.min(e[i],duration));}
  });
  const script=scriptFor(plan); const original=canonical(script);const spoken=canonical(chars.join(''));
  if(original.text!==spoken.text) throw new Error('Narration/alignment mismatch. Spell out numbers and acronyms before retrying.');
  const positions=new Map<number,{start:number;end:number}>();
  original.offsets.forEach((pos,i)=>{
    const a=spoken.offsets[i]; const prior=positions.get(pos);
    positions.set(pos,{start:prior?.start??starts[a],end:ends[a]});
  });
  function span(from:number,to:number) {
    const matches=[...positions.entries()].filter(([i])=>i>=from&&i<to).map(([,v])=>v);
    if(!matches.length) throw new Error('Cue has no aligned spoken characters.');
    return {start:matches[0].start,end:matches[matches.length-1].end};
  }
  let offset=0;
  const scenes=plan.scenes.map(scene=>{
    const narrationSpan=span(offset,offset+scene.narration.length);
    const motionAt=scene.motion?findOccurrence(scene.narration,scene.motion.triggerPhrase,scene.motion.occurrence):undefined;
    const arrayEvents=scene.arrayStory?.events.map(event=>{const at=findOccurrence(scene.narration,event.phrase,event.occurrence);return {...event,at:span(offset+at,offset+at+event.phrase.length).start};});
    const result={id:scene.id,start:narrationSpan.start,end:narrationSpan.end,...(arrayEvents?{arrayEvents}:{}),...(motionAt!==undefined?{motionStart:span(offset+motionAt,offset+motionAt+scene.motion!.triggerPhrase.length).start}:{}),cues:scene.cues.map(cue=>{
      const at=findOccurrence(scene.narration,cue.phrase,cue.occurrence);
      return {targetId:cue.targetId,at:span(offset+at,offset+at+cue.phrase.length).start};
    })};
    offset+=scene.narration.length+1;return result;
  });
  scenes[0].start=0;
  scenes.forEach((scene,i)=>scene.end=scenes[i+1]?.start??duration);
  const captions:Timeline['captions']=[];
  offset=0;
  for(const scene of plan.scenes) {
    const words=[...scene.narration.matchAll(/\S+/g)];
    let group:typeof words=[];
    const flush=()=>{if(!group.length)return; const first=group[0],last=group.at(-1)!;const timing=span(offset+first.index!,offset+last.index!+last[0].length);captions.push({text:group.map(w=>w[0]).join(' '),...timing});group=[];};
    for(const word of words) {if(group.length&&(group.map(w=>w[0]).join(' ').length+word[0].length>38||group.length>=5))flush();group.push(word);if(/[.!?]$/.test(word[0]))flush();}
    flush();offset+=scene.narration.length+1;
  }
  return {duration,scenes,captions};
}
