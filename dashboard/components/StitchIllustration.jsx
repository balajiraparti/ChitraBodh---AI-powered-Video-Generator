import React from 'react';
export default function StitchIllustration({onExpand}){return (<div className="relative flex-grow bg-[#FAFAF7] overflow-hidden flex flex-col">

<div className="absolute inset-0 pointer-events-none opacity-40">
<div className="w-full h-full diagram-dots"></div>
</div>

<div className="relative w-full h-full flex flex-col justify-between p-4 z-10 select-none">

<div className="flex justify-between items-start pt-2">

<div className="relative flex flex-col items-center">
<div className="w-12 h-12 rounded-full bg-solar border-2 border-[#d9a32c] flex items-center justify-center shadow-sm">
<span aria-hidden="true" className="material-symbols-outlined text-surface-container-lowest text-[24px]" data-icon="wb_sunny">wb_sunny</span>
</div>

<div className="text-[10px] font-mono text-tertiary mt-1 px-1.5 py-0.5 rounded bg-surface-container-high/80 border border-brand-stroke">
                    Solar Energy
                  </div>
</div>

<div className="flex flex-col items-end">
<div className="w-24 h-12 bg-surface-container-lowest rounded-full border border-brand-stroke shadow-sm relative flex items-center justify-center">
<div className="absolute -top-3 left-3 w-10 h-10 bg-surface-container-lowest rounded-full border-t border-l border-brand-stroke"></div>
<div className="absolute -top-2 right-4 w-8 h-8 bg-surface-container-lowest rounded-full border-t border-r border-brand-stroke"></div>
<span className="text-[10px] font-mono font-medium text-brand-ink z-10">Condensation</span>
</div>

<div className="text-[9px] font-mono text-brand-muted mt-1 mr-1">Cooling aloft</div>
</div>
</div>

<div className="my-auto grid grid-cols-2 gap-4 py-2">

<div className="flex flex-col items-center justify-center border-l-2 border-dashed border-primary/50 pl-2">
<div className="flex items-center gap-1 text-[11px] font-mono font-semibold text-primary">
<span aria-hidden="true" className="material-symbols-outlined text-[16px] text-primary" data-icon="north">north</span>
<span className="">Evaporation</span>
</div>
<span className="text-[9px] text-brand-muted font-mono">H₂O(l) → H₂O(g)</span>
<div className="flex gap-1 mt-1">
<span className="w-1 h-3 rounded-full bg-primary/40"></span>
<span className="w-1 h-3 rounded-full bg-primary/60"></span>
<span className="w-1 h-3 rounded-full bg-primary/80"></span>
</div>
</div>

<div className="flex flex-col items-center justify-center border-r-2 border-dashed border-coral/60 pr-2">
<div className="flex items-center gap-1 text-[11px] font-mono font-semibold text-coral">
<span className="">Precipitation</span>
<span aria-hidden="true" className="material-symbols-outlined text-[16px] text-coral" data-icon="south">south</span>
</div>
<span className="text-[9px] text-brand-muted font-mono">Liquid droplets</span>
<div className="flex gap-1 mt-1">
<span className="w-1 h-3 rounded-full bg-coral/80"></span>
<span className="w-1 h-3 rounded-full bg-coral/60"></span>
<span className="w-1 h-3 rounded-full bg-coral/40"></span>
</div>
</div>
</div>

<div className="relative w-full h-24 mt-2">

<svg className="w-full h-full overflow-visible" preserveaspectratio="none" viewBox="0 0 320 90">

<path d="M 0 70 Q 70 20 140 50 T 260 45 L 320 60 L 320 90 L 0 90 Z" fill="#E8ECE9" stroke="#BEC9C4" strokeWidth="1.5"></path>

<path d="M 0 65 C 60 65 110 70 170 70 C 230 70 280 62 320 65 L 320 90 L 0 90 Z" fill="#D5E3D9" stroke="#126B58" strokeWidth="1"></path>

<text fill="#126B58" fontFamily="Manrope" fontSize="9" fontWeight="600" x="35" y="82">Ocean Reservoir</text>
<text fill="#546159" fontFamily="Manrope" fontSize="8" x="200" y="58">Surface Runoff →</text>
</svg>
</div>
</div>

<div className="absolute bottom-16 left-3 right-3 z-30">
<div className="p-3 bg-brand-ink/90 backdrop-blur-sm rounded-xl text-surface-container-lowest border border-white/10 shadow-lg">
<div className="flex items-center gap-1.5 mb-1">
<span className="w-2 h-2 rounded-full bg-solar"></span>
<span className="text-[10px] uppercase font-mono tracking-wider text-outline-variant">Narration Track</span>
</div>
<p className="text-body-md font-body-md leading-snug">
                  "The sun warms water, turning some of it into water vapor."
                </p>
</div>
</div>

<div className="w-full bg-surface-container-lowest/95 backdrop-blur border-t border-brand-stroke px-3 py-2 z-30 flex flex-col gap-1.5">

<div className="w-full flex items-center justify-between py-0.5"><span className="text-[10px] font-mono text-brand-muted uppercase tracking-wider">Preview illustration</span><span className="text-[10px] font-mono text-brand-muted">Static draft</span></div>

<div className="flex items-center justify-between">
<div className="flex items-center gap-2"><button aria-label="Expand illustrated preview" className="px-2 py-1 rounded-lg bg-surface-container-low border border-brand-stroke text-brand-ink text-[10px] font-mono font-medium flex items-center gap-1" onClick={onExpand}><span aria-hidden="true" className="material-symbols-outlined text-[14px] text-primary" data-icon="visibility">visibility</span><span className="">Sample preview</span></button><span className="inline-flex items-center gap-1 text-[10px] text-brand-muted font-mono"><span aria-hidden="true" className="material-symbols-outlined text-[14px]" data-icon="volume_off">volume_off</span><span className="hidden sm:inline">No audio in preview</span></span></div>
<div className="flex items-center gap-1">
<button aria-label="Expand illustrated preview" className="w-7 h-7 rounded flex items-center justify-center text-brand-muted hover:text-brand-ink" onClick={onExpand}>
<span aria-hidden="true" className="material-symbols-outlined text-[18px]" data-icon="fullscreen">fullscreen</span>
</button>
</div>
</div>
</div>
</div>);}
