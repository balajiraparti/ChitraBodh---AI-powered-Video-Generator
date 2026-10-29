import React from 'react';
import {AbsoluteFill,Audio,useCurrentFrame,useVideoConfig,interpolate} from 'remotion';
import type {VideoProps} from '../contracts';
import {WaterCycle} from './WaterCycle';
import {ArraySearch} from './ArraySearch';

const paths:Record<string,React.ReactNode>={
 sun:<><circle cx="50" cy="50" r="19"/>{Array.from({length:8},(_,i)=><path key={i} d="M50 8V18" transform={`rotate(${i*45} 50 50)`}/>)}</>,
 water:<path d="M50 12C38 33 23 46 23 62a27 27 0 0054 0C77 46 62 33 50 12Z"/>,
 cloud:<path d="M24 72a19 19 0 01-2-38 28 28 0 0153 2 18 18 0 010 36Z"/>,
 rain:<><path d="M21 52a15 15 0 010-30 23 23 0 0144 1 15 15 0 010 30Z"/><path d="M28 65l-6 16m28-16-6 16m28-16-6 16"/></>,
 vapor:<path d="M25 84C5 65 45 52 25 31M50 73C30 54 70 41 50 20M75 84C55 65 95 52 75 31"/>,
 globe:<><circle cx="50" cy="50" r="36"/><ellipse cx="50" cy="50" rx="17" ry="36"/><path d="M14 50h72M20 30h60M20 70h60"/></>,
 leaf:<><path d="M20 80C0 20 50 12 85 15 88 65 65 90 20 80Z"/><path d="M20 80l47-47"/></>,
 chip:<><rect x="25" y="25" width="50" height="50" rx="8"/><path d="M38 10v15m24-15v15M38 75v15m24-15v15M10 38h15m-15 24h15M75 38h15m-15 24h15"/></>,
 database:<><ellipse cx="50" cy="24" rx="30" ry="12"/><path d="M20 24v50c0 16 60 16 60 0V24M20 49c0 16 60 16 60 0"/></>,
 bulb:<><path d="M35 68C5 35 30 12 50 12S95 35 65 68ZM36 79h28m-24 10h20"/></>,
 arrow:<path d="M15 50h65M60 28l22 22-22 22"/>,
 book:<><path d="M50 28Q28 13 12 22v60q20-9 38 4 18-13 38-4V22Q72 13 50 28v58"/></>,
 check:<path d="M17 51l23 23 44-48"/>,
 clock:<><circle cx="50" cy="50" r="36"/><path d="M50 25v27l19 12"/></>
};
export function Explainer({plan,timeline,audioUrl,captions,demo}:VideoProps){
 const frame=useCurrentFrame();const {fps}=useVideoConfig();const time=frame/fps;
 const index=Math.max(0,timeline.scenes.findIndex(s=>time>=s.start&&time<s.end));
 const timing=timeline.scenes[index];const scene=plan.scenes[index];
 const entrance=interpolate(time-timing.start,[0,.5],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
 const caption=timeline.captions.find(c=>time>=c.start&&time<c.end);
 const columns=scene.nodes.length===1?1:2;
 const positions=scene.nodes.map((_,i)=>({x:columns===1?450:225+(i%2)*450,y:scene.nodes.length<=2?320:190+Math.floor(i/2)*330}));
 return <AbsoluteFill style={{background:'#f6f5ee',color:'#142b36',fontFamily:'Arial, sans-serif',padding:'112px 90px'}}>
  {audioUrl&&<Audio src={audioUrl}/>}
  <div style={{display:'flex',justifyContent:'space-between',fontSize:25,letterSpacing:4,fontWeight:700,color:'#147c72'}}><span>CHITRABODH</span><span>EXPLAINED SIMPLY</span></div>
  <div style={{marginTop:125,fontSize:25,letterSpacing:5,color:'#61716e'}}>CHAPTER {String(index+1).padStart(2,'0')} / {String(plan.scenes.length).padStart(2,'0')}</div>
  <div style={{opacity:entrance,transform:`translateY(${(1-entrance)*25}px)`}}>
   <h1 style={{fontSize:76,lineHeight:1.1,letterSpacing:-3,margin:'28px 0 20px',minHeight:190}}>{scene.heading}</h1>
   <div style={{width:78,height:7,background:'#eea54b',borderRadius:6}}/>
   <div style={{position:'relative',height:770,marginTop:40}}>
    {scene.arrayStory?<ArraySearch story={scene.arrayStory} events={timeline.scenes.flatMap(s=>s.arrayEvents??[])} time={time}/>:scene.motion?<WaterCycle time={time} start={timing.motionStart??timing.start} phase={scene.motion.phase}/>:<>
    <svg width="900" height="730" style={{position:'absolute',inset:0}}><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0L6 3L0 6" fill="none" stroke="#8ca6a0" strokeWidth="1.5"/></marker></defs>{scene.edges.map((edge,i)=>{const a=positions[scene.nodes.findIndex(n=>n.id===edge.from)],b=positions[scene.nodes.findIndex(n=>n.id===edge.to)];const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);return <line key={i} x1={a.x+dx/len*125} y1={a.y+dy/len*125} x2={b.x-dx/len*135} y2={b.y-dy/len*135} stroke="#8ca6a0" strokeWidth="5" strokeDasharray="18 12" strokeDashoffset={-Math.max(0,time-(timing.cues.find(c=>c.targetId===edge.to)?.at??timing.start))*35} markerEnd="url(#arrow)"/>;})}</svg>
    {scene.nodes.map((node,i)=>{const cue=timing.cues.find(c=>c.targetId===node.id);const active=cue?time>=cue.at:true;const age=Math.max(0,time-(cue?.at??timing.start));const reveal=interpolate(age,[0,.5],[0,1],{extrapolateRight:"clamp"});const pos=positions[i];return <div key={node.id} style={{position:'absolute',left:pos.x-180,top:pos.y-115,width:360,textAlign:'center',opacity:active?.35+reveal*.65:.35,transform:`translateY(${active?(1-reveal)*22:22}px) scale(${active?.94+reveal*.06:.94})`}}><div style={{width:210,height:210,borderRadius:scene.layout==='comparison'?30:110,margin:'0 auto',background:active?'#deeee6':'#e8eae2',display:'flex',alignItems:'center',justifyContent:'center'}}><svg width="124" height="124" viewBox="0 0 100 100" fill="none" stroke="#147c72" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><g transform={node.iconId==='sun'?`rotate(${age*18} 50 50)`:undefined}>{paths[node.iconId]}</g>{active&&node.iconId==='water'&&<path d={`M30 ${65+Math.sin(age*3)*3}q10 -7 20 0t20 0`} strokeWidth="3"/>}{active&&node.iconId==='rain'&&<path d={`M32 ${60+(age*30)%25}l-4 8m26-8-4 8m26-8-4 8`} strokeWidth="3"/>}{active&&node.iconId==='vapor'&&[0,1,2].map(j=><circle key={j} cx={25+j*25} cy={82-((age*25+j*20)%65)} r="3" fill="#147c72" stroke="none"/>)}</svg></div><div style={{fontSize:34,lineHeight:1.2,fontWeight:600,marginTop:20,overflowWrap:'anywhere'}}>{node.label}</div></div>;})}
    </>}
   </div>
  </div>
  {captions&&caption&&<div style={{position:'absolute',bottom:270,left:100,right:100,textAlign:'center',fontSize:46,lineHeight:1.3,fontWeight:600}}><span style={{background:'#142b36',color:'#fff',padding:'12px 22px',boxDecorationBreak:'clone',borderRadius:14}}>{caption.text}</span></div>}
  <div style={{position:'absolute',bottom:165,left:90,right:90,height:5,background:'#dde3db'}}><div style={{width:`${time/timeline.duration*100}%`,height:5,background:'#147c72'}}/></div>
  <div style={{position:'absolute',bottom:112,left:90,right:90,fontSize:22,color:'#61716e',display:'flex',justifyContent:'space-between'}}><span>{demo?'OFFLINE DEMO · SILENT · SAMPLE TIMING':'A LITTLE KNOWLEDGE. CLEARLY EXPLAINED.'}</span><span>{Math.floor(time)}s</span></div>
 </AbsoluteFill>;
}
