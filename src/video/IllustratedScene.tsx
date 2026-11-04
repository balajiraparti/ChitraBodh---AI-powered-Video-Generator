import React from 'react';
import {objectPose,isConnectorKind,type Illustration,type IllustrationAction} from '../illustration';
import {connectorSegment,isBackdrop,labelCenter,layoutLabels,rectOf} from '../illustration-layout';
const palette:Record<string,string>={teal:'#168e94',blue:'#489dc6',green:'#5e9c6e',gold:'#efbc55',brown:'#a28160',gray:'#7e979e',white:'#fff',red:'#d1585a',orange:'#ec8a3f',purple:'#8a6fc4',ink:'#1f3a45'};
const LINE='#437c88';
// Molecules keep true circles: they are scaled by width only, and drawn in a 114-unit-wide cell.
const MOLECULE_WIDTH:Record<string,number>={co2:114,o2:82,h2o:84};
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
  case 'rect':return <rect x="-50" y="-50" width="100" height="100" rx="8" fill={color}/>;
  case 'triangle':return <path d="M0 -50L50 50H-50Z" fill={color} strokeLinejoin="round"/>;
  case 'diamond':return <path d="M0 -50L50 0L0 50L-50 0Z" fill={color}/>;
  case 'drop':return <path d="M0 -50C-20 -20 -38 0 -38 18a38 38 0 0076 0C38 0 20 -20 0 -50Z" fill={color}/>;
  case 'roots':return <g stroke={color} strokeWidth="7" fill="none" strokeLinecap="round"><path d="M0 -50V8M0 8Q-14 26 -36 46M0 8V50M0 8Q14 26 36 46M-16 28Q-30 30 -46 26M16 28Q30 30 46 26"/></g>;
  case 'co2':return <><path d="M-40 -5H0M-40 5H0M0 -5H40M0 5H40" stroke="#5d6b73" strokeWidth="3"/><circle cx="-40" r="17" fill="#d1585a"/><circle r="14" fill="#4d5b63"/><circle cx="40" r="17" fill="#d1585a"/></>;
  case 'o2':return <><path d="M-12 -4H12M-12 4H12" stroke="#8f3a3c" strokeWidth="3"/><circle cx="-24" r="16" fill="#d1585a"/><circle cx="24" r="16" fill="#d1585a"/></>;
  case 'h2o':return <><path d="M0 -8L-30 22M0 -8L30 22" stroke="#7e979e" strokeWidth="5"/><circle cy="-8" r="20" fill="#d1585a"/><circle cx="-30" cy="22" r="12" fill="#fff" stroke="#7e979e" strokeWidth="3"/><circle cx="30" cy="22" r="12" fill="#fff" stroke="#7e979e" strokeWidth="3"/></>;
  case 'laptop':return <><rect x="-38" y="-40" width="76" height="54" rx="5" fill={color}/><rect x="-32" y="-34" width="64" height="42" fill="#f1f7f8" opacity=".9"/>{[-20,-6,8].map((x,i)=><rect key={x} x={x} y={2-(i+1)*8} width="9" height={(i+1)*8} fill={color}/>)}<path d="M-50 22H50L42 36H-42Z" fill={color}/></>;
  case 'phone':return <><rect x="-26" y="-50" width="52" height="100" rx="10" fill={color}/><rect x="-20" y="-39" width="40" height="70" rx="3" fill="#f1f7f8"/><circle cy="40" r="4" fill="#f1f7f8"/></>;
  case 'server':return <>{[-46,-14,18].map(y=><g key={y}><rect x="-40" y={y} width="80" height="28" rx="5" fill={color}/><circle cx="-28" cy={y+14} r="3.5" fill="#f1f7f8"/><circle cx="-17" cy={y+14} r="3.5" fill="#f1f7f8"/><path d={`M2 ${y+14}H30`} stroke="#f1f7f8" strokeWidth="3"/></g>)}</>;
  case 'bottle':return <><rect x="-11" y="-50" width="22" height="14" rx="3" fill="#4d5b63"/><path d="M-9 -36H9V-26Q30 -18 30 0V44Q30 50 24 50H-24Q-30 50 -30 44V0Q-30 -18 -9 -26Z" fill={color}/><rect x="-30" y="4" width="60" height="22" fill="#fff" opacity=".6"/></>;
  case 'truck':return <><rect x="-50" y="-32" width="60" height="46" rx="4" fill={color}/><path d="M14 -20H34L50 0V14H14Z" fill={color}/><path d="M20 -14H32L42 -2H20Z" fill="#f1f7f8"/>{[-28,32].map(x=><circle key={x} cx={x} cy="20" r="10" fill="#2c3e45" stroke="#fff" strokeWidth="2.5"/>)}</>;
  default:return null;
 }
}
export function IllustratedScene({scene,actions,time,start}:{scene:Illustration;actions:IllustrationAction[];time:number;start?:number}){
 const night=scene.background==='night';
 const layout=React.useMemo(()=>layoutLabels(scene),[scene]);
 // Objects without their own appearance action pop in one after another when the scene starts.
 const intro=React.useMemo(()=>{
  const map=new Map<string,number>();if(start===undefined)return map;
  let rank=0;
  for(const o of scene.objects)if(!isConnectorKind(o.kind))map.set(o.id,isBackdrop(o.kind)?start:start+.25+rank++*.15);
  for(const o of scene.objects)if(isConnectorKind(o.kind))map.set(o.id,start+.35+rank*.15);
  return map;
 },[scene,start]);
 const poseOf=(id:string)=>{const object=scene.objects.find(o=>o.id===id)!;return objectPose(object,actions,time,intro.get(id));};
 const ink=night?'#e7f2f4':'#234951',halo=night?'#182f47':'#e1f0f2';
 return <svg width="1020" height="884" viewBox="0 0 900 780" role="img" aria-label="AI-authored animated illustration">
  <defs><clipPath id="illustration-canvas"><rect width="900" height="740" rx="32"/></clipPath><marker id="scene-arrow" markerUnits="userSpaceOnUse" markerWidth="24" markerHeight="24" refX="20" refY="12" orient="auto"><path d="M3 3L20 12L3 21" fill="none" stroke={LINE} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></marker></defs>
  <g clipPath="url(#illustration-canvas)">
   <rect width="900" height="740" fill={night?'#182f47':scene.background==='sky'?'#e1f0f2':'#eaf0e7'}/>
   {scene.objects.filter(o=>!isConnectorKind(o.kind)).map(object=>{
    const p=poseOf(object.id);if(p.opacity<=0)return null;
    const rect=rectOf(object,p.x,p.y,p.scale);
    const molecule=MOLECULE_WIDTH[object.kind];
    const sx=molecule?object.width/molecule*p.scale:object.width/100*p.scale,sy=molecule?sx:object.height/100*p.scale;
    const side=layout.sides.get(object.id)??'below',at=labelCenter(side,rect,object.label);
    return <g key={object.id} opacity={p.opacity}>
     {p.ring>=0&&<ellipse cx={p.x} cy={p.y} rx={object.width/2*(.7+.6*p.ring)} ry={object.height/2*(.7+.6*p.ring)} fill="none" stroke="#e39a1c" strokeWidth="5" opacity={1-p.ring}/>}
     <g transform={`translate(${p.x} ${p.y}) scale(${sx} ${sy}) rotate(${p.rotation})`}><Drawing kind={object.kind} color={palette[object.color]} time={time}/></g>
     {object.label&&(object.kind==='text'
      ?<text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" fontSize="32" fontWeight="600" fill={ink}>{object.label}</text>
      :<text x={at.x} y={at.y} textAnchor="middle" dominantBaseline="central" fontSize="24" fontWeight="600" fill={ink}>{object.label}</text>)}
    </g>;
   })}
   {scene.objects.filter(o=>isConnectorKind(o.kind)).map(object=>{
    const p=poseOf(object.id);if(p.opacity<=0)return null;
    const to=poseOf(object.toId!),toObject=scene.objects.find(o=>o.id===object.toId)!;
    const fromObject=object.fromId?scene.objects.find(o=>o.id===object.fromId):undefined,from=fromObject?poseOf(fromObject.id):undefined;
    const seg=connectorSegment(fromObject&&from?rectOf(fromObject,from.x,from.y,from.scale):{x:object.x,y:object.y},rectOf(toObject,to.x,to.y,to.scale));
    const drawn=p.draw,x2=seg.x1+(seg.x2-seg.x1)*drawn,y2=seg.y1+(seg.y2-seg.y1)*drawn;
    const style=object.style??(object.kind==='line'?'solid':'dashed');
    const dash=style==='dashed'?'10 9':style==='dotted'?'0.1 11':undefined;
    const flow=actions.find(a=>a.targetId===object.id&&a.action==='flow'&&time>=a.at);
    const elapsed=flow?time-flow.at:0,active=!!flow&&(flow.repeat||elapsed<=flow.duration),progress=flow?(flow.repeat?(elapsed%flow.duration)/flow.duration:Math.min(1,elapsed/flow.duration)):0;
    const t=layout.connectorT.get(object.id)??.5,lx=seg.x1+(seg.x2-seg.x1)*t,ly=seg.y1+(seg.y2-seg.y1)*t;
    return <g key={object.id} opacity={p.opacity}>
     <path d={`M${seg.x1} ${seg.y1}L${x2} ${y2}`} stroke={LINE} fill="none" strokeWidth={style==='dotted'?5:3} strokeLinecap={style==='dotted'?'round':'butt'} strokeDasharray={dash} markerEnd={object.kind==='arrow'&&drawn>=.99?'url(#scene-arrow)':undefined}/>
     {active&&[0,.33,.66].map((offset,i)=>{const q=(progress+offset)%1;return <circle key={i} cx={seg.x1+(seg.x2-seg.x1)*q} cy={seg.y1+(seg.y2-seg.y1)*q} r="7" fill={palette[object.color]} stroke="#fff" strokeWidth="1.5"/>;})}
     {object.label&&drawn>=.99&&<text x={lx} y={ly} textAnchor="middle" dominantBaseline="central" fontSize="22" fontWeight="600" fill={ink} stroke={halo} strokeWidth="6" paintOrder="stroke">{object.label}</text>}
    </g>;
   })}
  </g>
 </svg>;
}
