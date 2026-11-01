import React from 'react';
import {objectPose,type Illustration,type IllustrationAction} from '../illustration';
const palette={teal:'#168e94',blue:'#489dc6',green:'#5e9c6e',gold:'#efbc55',brown:'#a28160',gray:'#7e979e',white:'#fff'};
function Drawing({kind,color,time}:{kind:string;color:string;time:number}){
 switch(kind){
  case 'sun':return <><circle r="35" fill={color}/>{Array.from({length:12},(_,i)=><path key={i} d="M0 -42V-49" stroke={color} strokeWidth="5" transform={`rotate(${i*30})`}/>)}</>;
  case 'moon':return <><circle r="43" fill={color}/><circle cx="-16" cy="-16" r="7" fill="#b0bdc3" opacity=".6"/><circle cx="15" cy="16" r="10" fill="#b0bdc3" opacity=".5"/></>;
  case 'hill':return <path d="M-50 45Q-20 -65 0 -25Q25 -55 50 45Z" fill={color}/>;
  case 'water':return <><path d={`M-50 ${-20+Math.sin(time*2)*3}Q-25 -32 0 -20T50 -20V45H-50Z`} fill={color}/><path d={`M-45 3Q-20 ${Math.sin(time*2)*12} 5 3T45 3M-40 24Q-10 ${24+Math.sin(time*2+1)*8} 10 24T45 24`} stroke="#c3eeee" strokeWidth="3" fill="none"/></>;
  case 'cloud':return <path d="M-34 24C-63 23-51-15-29-11C-30-48 18-49 27-15C58-18 62 24 32 24Z" fill={color}/>;
  case 'tree':return <><path d="M-5 45V-9H6V45Z" fill="#89654e"/><circle cy="-20" r="29" fill={color}/><circle cx="-22" cy="-2" r="22" fill={color}/><circle cx="22" cy="-2" r="22" fill={color}/></>;
  case 'leaf':return <><path d="M-30 35Q-53-38 38-40Q50 35-30 35Z" fill={color}/><path d="M-30 35L25-25" stroke="#d6edcf" strokeWidth="3"/></>;
  case 'animal':return <><ellipse cx="-5" cy="4" rx="32" ry="20" fill={color}/><path d="M14 4L23-29L36-23L35 7M-27 14V43M-8 18V43M14 13L20 43M-35 0L-47-12" stroke={color} strokeWidth="8" fill="none" strokeLinecap="round"/><ellipse cx="31" cy="-27" rx="16" ry="12" fill={color}/><path d="M25-35L20-48M36-35L42-47" stroke={color} strokeWidth="5"/><circle cx="38" cy="-29" r="2.2" fill="#163942"/></>;
  case 'person':return <><circle cy="-31" r="14" fill={color}/><path d="M-19 15V-6Q0-22 19-6V15M0-10V20M-1 17L-17 46M1 17L17 46" stroke={color} strokeWidth="10" fill="none" strokeLinecap="round"/></>;
  case 'factory':return <><path d="M-45 45V-3L-15-20V-3L14-20V-3H45V45Z" fill={color}/><path d="M21-5V-44H35V-5" fill={color}/>{[-30,-5,20].map(x=><rect key={x} x={x} y="15" width="13" height="14" fill="#f4e6c2"/>)}</>;
  case 'soil':return <><rect x="-50" y="-35" width="100" height="75" rx="8" fill={color}/><path d="M-50-26H50" stroke="#81ae6f" strokeWidth="16"/>{[-30,0,30].map(x=><path key={x} d={`M${x} 0l8 15-4 14`} stroke="#d3bea0" fill="none" strokeWidth="3"/>)}</>;
  case 'atom':return <><circle r="12" fill={color}/>{[0,60,120].map(a=><ellipse key={a} rx="46" ry="18" fill="none" stroke={color} strokeWidth="3" transform={`rotate(${a})`}/>)}</>;
  case 'circle':return <circle r="43" fill={color}/>;
  case 'box':return <rect x="-45" y="-40" width="90" height="80" rx="12" fill={color}/>;
  default:return null;
 }
}
export function IllustratedScene({scene,actions,time}:{scene:Illustration;actions:IllustrationAction[];time:number}){
 const night=scene.background==='night';
 const pose=(id:string)=>{const object=scene.objects.find(o=>o.id===id)!;return objectPose(object,actions,time);};
 return <svg width="900" height="780" viewBox="0 0 900 780" role="img" aria-label="AI-authored animated illustration">
  <defs><clipPath id="illustration-canvas"><rect width="900" height="740" rx="32"/></clipPath><marker id="scene-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto"><path d="M0 0L6 3L0 6" fill="none" stroke="#437c88" strokeWidth="1.5"/></marker></defs>
  <g clipPath="url(#illustration-canvas)">
   <rect width="900" height="740" fill={night?'#182f47':scene.background==='sky'?'#e1f0f2':'#eaf0e7'}/>
   {scene.objects.filter(o=>o.kind!=='arrow').map(object=>{
    const p=pose(object.id);return <g key={object.id} opacity={p.opacity}>
     <g transform={`translate(${p.x} ${p.y}) scale(${object.width/100*p.scale} ${object.height/100*p.scale}) rotate(${p.rotation})`}><Drawing kind={object.kind} color={palette[object.color]} time={time}/></g>
     {object.label&&<text x={p.x} y={object.kind==='text'?p.y:Math.min(725,p.y+object.height/2+28)} textAnchor="middle" fontSize={object.kind==='text'?32:24} fontWeight="600" fill={night?'#e7f2f4':'#234951'}>{object.label}</text>}
    </g>;
   })}
   {scene.objects.filter(o=>o.kind==='arrow').map(object=>{
    const p=pose(object.id),end=pose(object.toId!);const a=actions.find(a=>a.targetId===object.id&&a.action==='flow'&&time>=a.at);
    const elapsed=a?time-a.at:0,active=!!a&&(a.repeat||elapsed<=a.duration),progress=a?(a.repeat?(elapsed%a.duration)/a.duration:Math.min(1,elapsed/a.duration)):0;
    return <g key={object.id} opacity={p.opacity}><path d={`M${p.x} ${p.y}L${end.x} ${end.y}`} stroke="#437c88" fill="none" strokeWidth="3" strokeDasharray="9 9" markerEnd="url(#scene-arrow)"/>{active&&[0,.33,.66].map((offset,i)=>{const t=(progress+offset)%1;return <circle key={i} cx={p.x+(end.x-p.x)*t} cy={p.y+(end.y-p.y)*t} r="7" fill={palette[object.color]}/>;})}{object.label&&<text x={(p.x+end.x)/2} y={(p.y+end.y)/2-14} textAnchor="middle" fontSize="22" fontWeight="600" fill={night?'#e7f2f4':'#234951'} stroke={night?'#182f47':'#e1f0f2'} strokeWidth="5" paintOrder="stroke">{object.label}</text>}</g>;
   })}
  </g>
 </svg>;
}
