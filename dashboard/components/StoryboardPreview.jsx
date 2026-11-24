import React,{useEffect,useMemo,useRef,useState} from 'react';
import {ExplainerFrame} from '../../src/video/Explainer';
import {storyboardEstimate} from '../../src/storyboard-preview';
export default function StoryboardPreview({plan,sceneIndex=0,captions=true,still}){
 const timeline=useMemo(()=>storyboardEstimate(plan),[plan]);
 const segment=timeline.scenes[Math.min(sceneIndex,timeline.scenes.length-1)];
 const [position,setPosition]=useState(.4),[playing,setPlaying]=useState(false),[width,setWidth]=useState(240);
 const ref=useRef(null),duration=segment.end-segment.start;
 useEffect(()=>{setPosition(.4);setPlaying(false)},[plan,sceneIndex]);
 useEffect(()=>{const observer=new ResizeObserver(entries=>setWidth(entries[0].contentRect.width));observer.observe(ref.current);return()=>observer.disconnect()},[]);
 useEffect(()=>{if(!playing)return;let id,last=performance.now();const tick=now=>{setPosition(p=>{const next=p+(now-last)/1000;return next>=duration?0:next});last=now;id=requestAnimationFrame(tick)};id=requestAnimationFrame(tick);return()=>cancelAnimationFrame(id)},[playing,duration]);
 const time=segment.start+Math.min(duration-.08,still===undefined?position:Math.max(.4,duration*still));
 return <div className="sb-preview"><div className="sb-portrait" ref={ref}><div className="sb-canvas" style={{transform:`scale(${width/1080})`}}><ExplainerFrame plan={plan} timeline={timeline} captions={captions} demo={false} time={time}/></div></div>{still===undefined&&<><div className="sb-playbar"><button type="button" onClick={()=>setPlaying(!playing)} aria-label={playing?'Pause silent preview':'Play silent preview'}>{playing?'Pause':'Play'}</button><input aria-label="Scene preview time" type="range" min="0" max={Math.max(0,duration-.08)} step="0.05" value={Math.min(position,duration-.08)} onChange={e=>{setPlaying(false);setPosition(Number(e.target.value))}}/><span>{Math.floor(position)}s</span></div><small>Silent preview · estimated timing</small></>}</div>;
}
