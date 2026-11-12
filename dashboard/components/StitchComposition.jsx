import React from 'react';
export default function StitchComposition(){return (<aside className="lg:col-span-4 space-y-6">

<div className="bg-surface-container-lowest rounded-2xl border border-outline-variant p-6 space-y-4">
<div className="flex items-center justify-between">
<span className="text-label-md font-semibold uppercase tracking-wider text-secondary">Composition Preview</span>
<span className="text-label-sm text-primary font-semibold">9:16 Frame</span>
</div>

<div className="relative w-full aspect-[9/13] max-w-[240px] mx-auto rounded-xl border border-outline-variant bg-surface-container-low p-3 flex flex-col justify-between overflow-hidden shadow-inner">

<div className="absolute inset-0 opacity-15 pointer-events-none diagram-dots"></div>

<div className="relative z-10 space-y-1">
<div className="flex items-center justify-between text-[10px] text-secondary font-mono">
<span className="">Sample scene</span>
<span className="">Illustration</span>
</div>
<div className="h-1.5 w-16 bg-primary-container/20 rounded-full overflow-hidden">
<div className="h-full w-2/3 bg-primary-container"></div>
</div>
</div>

<div className="relative z-10 my-auto p-3 bg-surface-container-lowest rounded-lg border border-outline-variant text-center space-y-2">
<div className="flex justify-center items-center gap-2 text-primary">
<span aria-hidden="true" className="material-symbols-outlined text-[26px]">wb_sunny</span>
<span aria-hidden="true" className="material-symbols-outlined text-[18px]">trending_up</span>
<span aria-hidden="true" className="material-symbols-outlined text-[24px]">cloud</span>
</div>
<div className="text-[11px] font-semibold text-on-surface">Evaporation &amp; Condensation</div>
</div>

<div className="relative z-10 space-y-2 text-center">
<div className="inline-block px-2.5 py-1 bg-inverse-surface text-inverse-on-surface rounded text-[10px] font-medium leading-tight">
                "Solar heat warms the water bodies..."
              </div>
</div>
</div>
<p className="text-label-sm text-secondary text-center leading-relaxed">Generates synchronized vector diagrams and Indian English narration automatically.</p>
</div>

<div className="bg-surface-container-low rounded-2xl border border-outline-variant p-5 flex items-start gap-3"><span aria-hidden="true" className="material-symbols-outlined text-primary text-[22px] mt-0.5">info</span><div><p className="text-label-md font-semibold text-on-surface">Format &amp; Duration</p><p className="text-body-md text-secondary text-sm mt-0.5">Videos are 9:16 vertical and typically 60–90 seconds.</p></div></div>
</aside>);}
