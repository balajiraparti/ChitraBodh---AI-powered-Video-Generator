import React from 'react';
import type {ArrayStory,TimedArrayEvent} from '../array-story';

export function arrayDisplay(values:number[],events:TimedArrayEvent[],time:number){
 const seen=events.filter(e=>e.at<=time);const operations=seen.filter(e=>e.action!=='show');
 const current=operations.at(-1);const comparisons=operations.filter(e=>e.action==='compare');
 let low=0,high=values.length-1;
 for(const event of operations){if(event.action==='discard_left')low=event.mid+1;if(event.action==='discard_right')high=event.mid-1;}
 return {current,comparisons,low,high,found:current?.action==='found',missing:current?.action==='not_found'};
}
export function ArraySearch({story,events,time}:{story:ArrayStory;events:TimedArrayEvent[];time:number}){
 const {values,target}=story;const state=arrayDisplay(values,events,time);const {current,comparisons,low,high,found,missing}=state;
 const compare=comparisons.at(-1);const previous=comparisons.at(-2);const latestMid=compare?.mid??-1;
 const gap=10,width=(840-gap*(values.length-1))/values.length;
 const x=(i:number)=>30+i*(width+gap),center=(i:number)=>x(i)+width/2;
 const transition=compare?Math.min(1,Math.max(0,(time-compare.at)/.65)):0;
 const eased=1-Math.pow(1-transition,3);
 const pointer=latestMid>=0?center(previous?.mid??latestMid)+(center(latestMid)-center(previous?.mid??latestMid))*eased:0;
 const discard=current?.action==='discard_left'||current?.action==='discard_right';
 const fade=discard?Math.min(1,Math.max(0,(time-current.at)/.8)):1;
 const relation=latestMid<0?'':values[latestMid]<target?'<':values[latestMid]>target?'>':'=';
 const comparison=compare?`${values[compare.mid]} ${relation} ${target}`:'Start with a sorted array';
 const instruction=found?`Found ${target} at index ${latestMid}`:missing?'The target is not in this array':current?.action==='discard_left'?`Keep the right side · LOW moves to ${low}`:current?.action==='discard_right'?`Keep the left side · HIGH moves to ${high}`:compare?'Compare the middle value with the target':'Indices begin at zero';
 const count=Math.max(0,high-low+1);
 return <svg width="900" height="820" viewBox="0 0 900 820" role="img" aria-label="AI-planned binary search with array boxes and operation trace">
  <defs><marker id="midArrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0L6 3L0 6Z" fill="#d99928"/></marker></defs>
  <rect width="900" height="815" rx="32" fill="#edf2ec"/>
  <rect x="28" y="25" width="270" height="74" rx="18" fill="#163b45"/><text x="163" y="73" textAnchor="middle" fill="white" fontSize="34" fontWeight="700">FIND {target}</text>
  <text x="865" y="54" textAnchor="end" fill="#45656c" fontSize="22">SORTED · LOW TO HIGH</text>
  <text x="865" y="85" textAnchor="end" fill="#147c72" fontSize="24" fontWeight="600">{comparisons.length?`Comparison ${comparisons.length}`:'Our search example'}</text>
  <text x="450" y="164" textAnchor="middle" fill="#365b62" fontSize="28">{compare?`MID = floor((${compare.low} + ${compare.high}) ÷ 2) = ${compare.mid}`:'Always search a sorted list'}</text>
  {compare&&<g><rect x={pointer-48} y="205" width="96" height="45" rx="12" fill={found?'#147c72':'#e9b75b'}/><text x={pointer} y="236" textAnchor="middle" fill="#183841" fontSize="24" fontWeight="700">{found?'FOUND':'MID'}</text><path d={`M${pointer} 257V306`} stroke="#d99928" strokeWidth="4" markerEnd="url(#midArrow)"/></g>}
  {count>0&&<rect x={x(low)-8} y="318" width={x(high)+width-x(low)+16} height="110" rx="16" fill="#c9e9dc" stroke="#62a68d" strokeWidth="2"/>}
  {values.map((value,i)=>{
   const excluded=i<low||i>high;
   const newlyExcluded=discard&&i>=current.low&&i<=current.high&&excluded;
   const opacity=excluded?(newlyExcluded?1-fade*.72:.28):1;
   const selected=i===latestMid;
   return <g key={i} opacity={opacity} transform={`translate(0 ${newlyExcluded?fade*8:0})`}>
    <rect x={x(i)} y="330" width={width} height="86" rx="12" fill={selected?(found?'#147c72':'#f5d087'):'#fff'} stroke={selected?(found?'#147c72':'#c98a20'):'#a7c0b7'} strokeWidth={selected?4:2}/>
    <text x={center(i)} y="385" textAnchor="middle" fontSize={values.length>7?38:44} fill={found&&selected?'white':'#173e46'} fontWeight="700">{value}</text>
    <text x={center(i)} y="462" textAnchor="middle" fontSize="24" fill="#466b72">{i}</text>
    {excluded&&<path d={`M${x(i)+12} 400L${x(i)+width-12} 345`} stroke="#6a8689" strokeWidth="2"/>}
   </g>;
  })}
  <text x="450" y="501" textAnchor="middle" fill="#637f80" fontSize="20">INDEX · {count} candidate{count===1?'':'s'} remaining</text>
  <g fontSize="23" textAnchor="middle" fontWeight="600"><rect x="45" y="526" width="230" height="46" rx="10" fill="#d5e5dd"/><text x="160" y="557" fill="#326753">LOW {low}</text><rect x="335" y="526" width="230" height="46" rx="10" fill="#f0dfbc"/><text x="450" y="557" fill="#806024">MID {latestMid<0?'—':latestMid}</text><rect x="625" y="526" width="230" height="46" rx="10" fill="#d5e5dd"/><text x="740" y="557" fill="#326753">HIGH {high}</text></g>
  <text x="450" y="645" textAnchor="middle" fill={found?'#147c72':'#173e46'} fontSize={compare?50:32} fontWeight="700">{comparison}</text>
  <text x="450" y="697" textAnchor="middle" fill="#315a63" fontSize="27">{instruction}</text>
  <text x="450" y="767" textAnchor="middle" fill="#55777d" fontSize="24">{comparisons.length?`Checked: ${comparisons.map(e=>values[e.mid]).join(' → ')}`:'Pick the middle. Compare. Narrow the range.'}</text>
 </svg>;
}
