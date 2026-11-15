import React from 'react';

// Icon-style real-world objects. Every drawing fits a 100 x 100 box centered on the origin.
const DARK='#2c3e45',LIGHT='#f1f7f8';
export function IconDrawing({kind,color,time}:{kind:string;color:string;time:number}){
 switch(kind){
  case 'house':return <><path d="M-46 -4L0 -46L46 -4Z" fill={DARK}/><rect x="-36" y="-4" width="72" height="50" fill={color}/><rect x="-10" y="14" width="20" height="32" rx="2" fill={LIGHT}/><rect x="-30" y="6" width="14" height="14" fill={LIGHT}/><rect x="16" y="6" width="14" height="14" fill={LIGHT}/></>;
  case 'car':return <><path d="M-48 14V0Q-46 -8 -36 -10L-24 -30Q-20 -36 -12 -36H18Q26 -36 30 -30L40 -10Q48 -8 48 2V14Z" fill={color}/><path d="M-18 -28H-4V-10H-30ZM4 -28H16L28 -10H4Z" fill={LIGHT}/>{[-28,28].map(x=><circle key={x} cx={x} cy="16" r="12" fill={DARK} stroke={LIGHT} strokeWidth="3"/>)}</>;
  case 'coin':return <><circle r="44" fill={color}/><circle r="34" fill="none" stroke="#fff" strokeWidth="4" opacity=".8"/><path d="M-15 -20H15M-15 -7H15M-15 -20H-2Q16 -20 16 -6Q16 8 -2 8H-15L14 32" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none"/></>;
  case 'check':return <><circle r="44" fill={color}/><path d="M-22 2L-6 18L24 -16" stroke="#fff" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" fill="none"/></>;
  case 'lock':return <><path d="M-22 -8V-24A22 22 0 0122 -24V-8" stroke={DARK} strokeWidth="9" fill="none"/><rect x="-36" y="-10" width="72" height="56" rx="10" fill={color}/><circle cy="14" r="8" fill={LIGHT}/><rect x="-3" y="16" width="6" height="16" rx="3" fill={LIGHT}/></>;
  case 'shield':return <><path d="M0 -46L38 -32V4C38 28 18 42 0 48C-18 42 -38 28 -38 4V-32Z" fill={color}/><path d="M-16 2L-4 14L18 -12" stroke="#fff" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none"/></>;
  case 'bulb':return <><path d="M-26 -8A30 30 0 1126 -8C26 6 14 12 14 24H-14C-14 12 -26 6 -26 -8Z" fill={color}/><rect x="-14" y="26" width="28" height="8" rx="3" fill={DARK}/><rect x="-10" y="36" width="20" height="8" rx="3" fill={DARK}/><path d="M-6 22V-4L0 4L6 -4V22" stroke="#fff" strokeWidth="3" fill="none" opacity=".8"/></>;
  case 'gear':return <g transform={`rotate(${time*25})`}>{Array.from({length:10},(_,i)=><rect key={i} x="-7" y="-48" width="14" height="22" rx="3" fill={color} transform={`rotate(${i*36})`}/>)}<circle r="34" fill={color}/><circle r="14" fill={LIGHT}/></g>;
  case 'chart':return <><path d="M-44 -40V40H44" stroke={DARK} strokeWidth="5" fill="none" strokeLinecap="round"/>{[[-30,28],[-8,46],[14,66],[34,84]].map(([x,h],i)=>{const grow=Math.min(1,.55+.45*Math.abs(Math.sin(time*.9+i)));return <rect key={x} x={x} y={36-h*.8*grow} width="16" height={h*.8*grow} rx="3" fill={i===3?'#efbc55':color}/>;})}</>;
  case 'cart':return <><path d="M-48 -34H-34L-22 18H32L42 -16H-30" stroke={DARK} strokeWidth="6" fill="none" strokeLinejoin="round" strokeLinecap="round"/><path d="M-28 -14H38L30 14H-20Z" fill={color}/>{[-14,24].map(x=><circle key={x} cx={x} cy="34" r="8" fill={DARK}/>)}</>;
  case 'store':return <><path d="M-46 -12L-38 -40H38L46 -12Z" fill={DARK}/>{[-34,-12,12,34].map((x,i)=><path key={x} d={`M${x-11} -40H${x+11}L${x+(i<2?8:8)} -12H${x-11}Z`} fill={i%2?LIGHT:'#d1585a'}/>)}<rect x="-38" y="-12" width="76" height="54" fill={color}/><rect x="-10" y="8" width="22" height="34" fill={LIGHT}/><rect x="-32" y="-2" width="16" height="22" fill={LIGHT}/></>;
  case 'envelope':return <><rect x="-46" y="-30" width="92" height="60" rx="8" fill={color}/><path d="M-46 -26L0 8L46 -26" stroke="#fff" strokeWidth="5" fill="none" strokeLinejoin="round"/></>;
  case 'battery':return <><rect x="-44" y="-24" width="84" height="48" rx="8" fill="none" stroke={DARK} strokeWidth="6"/><rect x="40" y="-10" width="9" height="20" rx="3" fill={DARK}/>{[0,1,2].map(i=>{const on=((time*1.2)%4)>i+.5;return <rect key={i} x={-36+i*26} y="-16" width="20" height="32" rx="3" fill={color} opacity={on?1:.28}/>;})}</>;
  case 'solar_panel':return <><path d="M-34 -30H46L36 20H-44Z" fill="#2f5d8a"/>{[-1,0,1].map(i=><path key={i} d={`M${-34+i*26+13} -30L${-44+i*26+13} 20`} stroke="#bcd4ea" strokeWidth="2"/>)}{[-14,4].map(y=><path key={y} d={`M${-40+(y+30)*-0.2} ${y}H${42-(y+30)*0.2}`} stroke="#bcd4ea" strokeWidth="2"/>)}<path d="M-4 20V44M-24 44H16" stroke={DARK} strokeWidth="6" strokeLinecap="round"/><circle cx="-36" cy="-42" r="9" fill={color} opacity=".9"/></>;
  case 'wind_turbine':return <><path d="M-4 48L-1 -6H1L4 48Z" fill={DARK}/><g transform={`translate(0 -8) rotate(${time*70})`}>{[0,120,240].map(a=><path key={a} d="M-3 0L0 -44L3 0Z" fill={color} transform={`rotate(${a})`}/>)}<circle r="5" fill={DARK}/></g></>;
  case 'bell':return <><path d="M-34 24C-30 10 -30 -4 -26 -18C-22 -34 -10 -40 0 -40C10 -40 22 -34 26 -18C30 -4 30 10 34 24Z" fill={color}/><rect x="-38" y="24" width="76" height="8" rx="4" fill={color}/><circle cy="40" r="8" fill={DARK}/><circle cy="-44" r="5" fill={color}/></>;
  case 'heart':return <path d="M0 40C-50 6 -44 -36 -20 -38C-8 -38 0 -30 0 -22C0 -30 8 -38 20 -38C44 -36 50 6 0 40Z" fill={color}/>;
  case 'globe':return <><circle r="42" fill={color}/><g fill="none" stroke="#fff" strokeWidth="3" opacity=".85"><ellipse rx="18" ry="42"/><path d="M-42 0H42M-36 -22H36M-36 22H36"/></g></>;
  case 'clock':return <><circle r="44" fill={LIGHT} stroke={color} strokeWidth="8"/><path d="M0 -32V0" stroke={DARK} strokeWidth="5" strokeLinecap="round" transform={`rotate(${time*40})`}/><path d="M0 -22V0" stroke={DARK} strokeWidth="6" strokeLinecap="round" transform={`rotate(${time*3.3})`}/><circle r="4" fill={DARK}/></>;
  case 'qr':return <><rect x="-44" y="-44" width="88" height="88" rx="8" fill="#fff" stroke={DARK} strokeWidth="4"/>{[[-34,-34],[14,-34],[-34,14]].map(([x,y])=><g key={`${x}${y}`}><rect x={x} y={y} width="26" height="26" fill={DARK}/><rect x={x+6} y={y+6} width="14" height="14" fill="#fff"/><rect x={x+10} y={y+10} width="6" height="6" fill={DARK}/></g>)}{[[2,2],[16,10],[8,22],[26,22],[2,30],[20,32],[32,2]].map(([x,y])=><rect key={`${x}-${y}`} x={x} y={y} width="8" height="8" fill={color}/>)}</>;
  case 'bank':return <><path d="M-46 -20L0 -46L46 -20Z" fill={color}/>{[-30,-10,10,30].map(x=><rect key={x} x={x-5} y="-14" width="10" height="42" fill={LIGHT} stroke={color} strokeWidth="3"/>)}<rect x="-46" y="30" width="92" height="12" rx="3" fill={color}/><circle cy="-26" r="5" fill="#fff"/></>;
  case 'book':return <><path d="M0 -30Q-24 -42 -46 -32V32Q-24 22 0 34Q24 22 46 32V-32Q24 -42 0 -30Z" fill={color}/><path d="M0 -30V34" stroke="#fff" strokeWidth="3"/><path d="M-36 -16Q-24 -20 -10 -16M-36 -4Q-24 -8 -10 -4M10 -16Q24 -20 36 -16M10 -4Q24 -8 36 -4" stroke="#fff" strokeWidth="3" fill="none" opacity=".8"/></>;
  default:return null;
 }
}

const GROUND='#9fcba8';
/** Themed scenery behind the objects. Pale and low-contrast so labels stay readable; gently animated. */
export function Backdrop({setting,time}:{setting?:string;time:number}){
 const drift=(speed:number,offset:number)=>((time*speed+offset)%1100)-100;
 switch(setting){
  case 'outdoor':return <g opacity=".95">
   {[[0,90,1],[420,150,.8],[700,60,.9]].map(([o,y,s],i)=><path key={i} transform={`translate(${drift(14+i*5,o)} ${y}) scale(${s})`} d="M-34 24C-63 23-51-15-29-11C-30-48 18-49 27-15C58-18 62 24 32 24Z" fill="#fff" opacity=".8"/>)}
   <path d="M0 650Q220 610 450 640T900 630V740H0Z" fill={GROUND}/><path d="M0 700Q300 670 900 695V740H0Z" fill="#86b896"/></g>;
  case 'room':return <g>
   <rect y="560" width="900" height="180" fill="#dcc9a8"/><rect y="552" width="900" height="10" fill="#c9b48f"/>
   <rect x="640" y="70" width="190" height="210" rx="10" fill="#cfe7ee" stroke="#b5ccd4" strokeWidth="8"/><path d="M735 70V280M640 175H830" stroke="#b5ccd4" strokeWidth="6"/>
   <circle cx="690" cy={130+Math.sin(time)*3} r="14" fill="#fff6d6" opacity=".8"/></g>;
  case 'city':return <g fill="#bcd2d8">
   {[[0,360,90],[80,300,110],[190,400,80],[270,330,100],[370,380,90],[460,290,120],[580,370,90],[670,320,110],[780,390,120]].map(([x,y,w],i)=><g key={i}><rect x={x} y={y} width={w} height={740-y}/>{[0,1,2,3].map(r=>[0,1].map(c=><rect key={`${r}${c}`} x={x+16+c*(w/2-8)} y={y+20+r*44} width="12" height="18" fill={((Math.floor(time*.6)+i+r+c)%4)?'#e6f1f3':'#f6e7b4'}/>))}</g>)}
   <rect y="690" width="900" height="50" fill="#a9c1c8"/></g>;
  case 'lab':return <g>
   <rect y="600" width="900" height="140" fill="#cdd9dc"/><rect y="592" width="900" height="12" fill="#b4c4c8"/>
   {[0,1,2,3,4,5].map(i=><path key={i} d={`M${i*180} 0V590`} stroke="#d4e4e7" strokeWidth="3"/>)}
   {[0,1,2].map(i=><path key={i} d={`M0 ${i*190+60}H900`} stroke="#d4e4e7" strokeWidth="3"/>)}</g>;
  case 'digital':return <g stroke="#7aa6b0" opacity=".35" fill="none">
   {Array.from({length:10},(_,i)=><path key={i} d={`M${i*100} 0V740`} strokeWidth="1.5"/>)}{Array.from({length:8},(_,i)=><path key={i} d={`M0 ${i*100}H900`} strokeWidth="1.5"/>)}
   {[0,1,2,3,4].map(i=><circle key={i} cx={100+i*190} cy={drift(40+i*9,i*210)%740} r="5" fill="#7aa6b0" stroke="none"/>)}</g>;
  default:return null;
 }
}
