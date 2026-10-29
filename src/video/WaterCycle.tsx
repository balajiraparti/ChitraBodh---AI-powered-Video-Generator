import React from 'react';
import type {Plan} from '../contracts';
type Phase=NonNullable<Plan['scenes'][number]['motion']>['phase'];
export const phaseLabels:Record<Phase,string>={overview:'A continuous journey',evaporation:'Liquid water → invisible vapor',condensation:'Cooling vapor → cloud droplets',precipitation:'Growing droplets → falling rain',collection:'Runoff + water entering soil'};
export function motionState(time:number,start:number,phase:Phase){
 const elapsed=Math.max(0,time-start),active=time>=start;
 return {elapsed,active,evaporation:active&&(phase==='overview'||phase==='evaporation'),condensation:active&&(phase==='overview'||phase==='condensation'),rain:active&&(phase==='overview'||phase==='precipitation'),collection:active&&(phase==='overview'||phase==='collection')};
}
export function WaterCycle({time,start,phase}:{time:number;start:number;phase:Phase}){
 const m=motionState(time,start,phase),t=m.elapsed;
 const wave=(y:number,shift:number)=>`M-50 ${y} ${Array.from({length:12},(_,i)=>`Q${i*100+shift} ${y-12} ${i*100+50+shift} ${y} T${i*100+100+shift} ${y}`).join(' ')} V840 H-50Z`;
 const cloudScale=phase==='condensation'?Math.min(1,.55+(m.active?t*.16:0)):1;
 return <svg width="900" height="820" viewBox="0 0 900 820" role="img" aria-label={`Animated water cycle: ${phase}`}>
  <defs>
   <linearGradient id="sky" x2="0" y2="1"><stop stopColor="#dceef4"/><stop offset="1" stopColor="#f3f8ed"/></linearGradient>
   <linearGradient id="lake" x2="0" y2="1"><stop stopColor="#55bfc6"/><stop offset="1" stopColor="#167b9a"/></linearGradient>
   <clipPath id="landscape"><rect x="0" y="0" width="900" height="740" rx="38"/></clipPath>
   <clipPath id="lakeClip"><path d="M0 554Q190 524 400 590L445 740H0Z"/></clipPath>
   <marker id="flowArrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0L6 3L0 6" fill="none" stroke="#168d9e" strokeWidth="1.5"/></marker>
  </defs>
  <g clipPath="url(#landscape)">
   <rect width="900" height="740" fill="url(#sky)"/>
   <circle cx="145" cy="140" r={70+Math.sin(time*1.5)*5} fill="#ffe6a3" opacity=".45"/>
   <g transform={`translate(145 140) rotate(${time*8})`} stroke="#edb344" strokeWidth="6" strokeLinecap="round">{Array.from({length:12},(_,i)=><line key={i} x1="0" y1="-68" x2="0" y2="-88" transform={`rotate(${i*30})`}/>)}</g>
   <circle cx="145" cy="140" r="47" fill="#f5c355"/>
   {m.evaporation&&<g stroke="#eeb244" strokeWidth="5" strokeLinecap="round" strokeDasharray="12 30" strokeDashoffset={-t*65} opacity=".65"><path d="M130 230L135 420"/><path d="M180 225L230 430"/><path d="M222 214L315 405"/></g>}
   <path d="M280 585L585 250L900 575V740H280Z" fill="#adc8bf"/>
   <path d="M585 250L668 336L610 317L580 341L549 320L500 345Z" fill="#f9fcf6"/>
   <path d="M0 576Q200 530 380 580Q630 480 900 545V740H0Z" fill="#8cb998"/>
   <path d="M0 655Q300 605 900 650V740H0Z" fill="#bbac88"/>
   <path d="M0 554Q190 524 400 590L445 740H0Z" fill="url(#lake)"/>
   <g clipPath="url(#lakeClip)" opacity=".55"><path d={wave(566,Math.sin(time*1.8)*26)} fill="#9be0df"/><path d={wave(605,Math.sin(time*1.6+2)*24)} fill="#4fb4c4"/><path d={wave(670,Math.sin(time*1.4)*28)} fill="#238eab"/></g>
   <path d="M741 420Q684 480 710 511T618 570Q564 607 380 618" fill="none" stroke="#c8efec" strokeWidth="22" strokeLinecap="round"/>
   <path d="M741 420Q684 480 710 511T618 570Q564 607 380 618" fill="none" stroke="#46a9ba" strokeWidth="10" strokeDasharray="14 18" strokeDashoffset={m.collection?-t*65:0}/>
   {m.evaporation&&<g>{Array.from({length:10},(_,i)=>{const p=(t*.23+i/10)%1;return <g key={i} opacity={Math.sin(p*Math.PI)*.8}><circle cx={100+i*23+Math.sin(p*6+i)*15} cy={540-p*290} r={4+p*3} fill="#408b9c"/><path d={`M${125+i*19} ${510-p*255}l0 -15m-5 5l5 -5 5 5`} fill="none" stroke="#408b9c" strokeWidth="2"/></g>;})}<path d="M270 490Q280 300 420 242" fill="none" stroke="#168d9e" strokeWidth="3" strokeDasharray="9 9" strokeDashoffset={-t*30} markerEnd="url(#flowArrow)"/></g>}
   <g transform={`translate(${620+Math.sin(time*.45)*9} 205) scale(${cloudScale})`}>
    <path d="M-135 48C-192 48-192-25-143-29C-141-94-53-112-16-65C22-113 103-77 102-27C171-29 175 48 118 48Z" fill={m.rain?'#b5c9d0':'#fff'} stroke="#c7dce0" strokeWidth="3"/>
    {m.condensation&&Array.from({length:16},(_,i)=>{const p=(t*.3+i/16)%1;return <circle key={i} cx={-120+(i%8)*32} cy={-38+Math.floor(i/8)*36} r={2+p*7} fill="#79bcc9" opacity={.2+p*.55}/>;})}
   </g>
   {m.rain&&Array.from({length:32},(_,i)=>{const p=(t*.6+i/32)%1;const x=505+(i%11)*24;const y=265+p*275;return <g key={i} opacity={Math.sin(p*Math.PI)}><path d={`M${x} ${y}l-9 24`} stroke="#3c98b9" strokeWidth="4" strokeLinecap="round"/>{p>.85&&<ellipse cx={x-9} cy="548" rx={(p-.85)*70} ry="3" stroke="#50a1ad" fill="none"/>}</g>;})}
   {m.collection&&Array.from({length:8},(_,i)=>{const p=(t*.22+i/8)%1;return <g key={i} opacity={Math.sin(p*Math.PI)}><path d={`M${525+i*38} ${614+p*92}v14m-4-4l4 4 4-4`} fill="none" stroke="#277e94" strokeWidth="3"/></g>;})}
   <g fontFamily="Arial" fontSize="25" fontWeight="600" fill="#204752">
    <text x="60" y="38">SUN'S ENERGY</text><text x="540" y="95">CLOUD DROPLETS</text>
    <text x="65" y="710" fill="#fff">LAKE / OCEAN</text><text x="570" y="712">SOIL + GROUNDWATER</text>
   </g>
   {phase==='evaporation'&&<g><rect x="33" y="336" width="269" height="75" rx="14" fill="#fff" opacity=".92"/><text x="50" y="365" fill="#206776" fontSize="24">Vapor is invisible</text><text x="50" y="393" fill="#577a80" fontSize="20">Dots show its movement</text></g>}
  </g>
  <text x="450" y="790" textAnchor="middle" fill="#147c72" fontSize="29" fontWeight="600">{phaseLabels[phase]}</text>
 </svg>;
}
