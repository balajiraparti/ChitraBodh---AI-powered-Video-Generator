import {useRef,useState} from 'react';
import StitchIllustration from '../components/StitchIllustration';
function SearchDiagram({onExpand}){return <div className="search-diagram"><h2>Linear search</h2><p>Find 2, starting at index 0.</p><div className="array">{[4,7,2,9].map((n,i)=><span key={n}>{n}<small>{['×','×','✓',''][i]}</small></span>)}</div>{onExpand && <button onClick={onExpand}>Expand preview</button>}</div>}
export default function Home(){const [search,setSearch]=useState(false);const dialog=useRef(null);return <div className="stitch-home"><section className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-start mb-24">

<div className="lg:col-span-7 flex flex-col pt-2 lg:pt-6">



<h1 className="text-display font-display text-on-surface tracking-tight mb-6 max-w-xl">
          Your idea. <span className="font-instrument italic font-normal text-[4rem] text-primary">A clearer picture.</span>
</h1>

<p className="text-body-lg font-body-lg text-secondary mb-8 max-w-lg leading-relaxed">Turn a topic into a narrated explainer with diagrams that move with the explanation.</p>

<div className="flex flex-wrap items-center gap-space-md mb-12">
<a className="h-[44px] px-5 rounded-xl bg-primary-container text-on-primary font-label-md text-label-md font-semibold hover:bg-primary transition-all duration-150 active:scale-[0.99] flex items-center gap-2 shadow-sm" href="/sign-in">
<span className="">Create a video</span>
<span aria-hidden="true" className="material-symbols-outlined text-[18px]" data-icon="play_circle">play_circle</span>
</a>
<a className="h-[44px] px-4 rounded-xl border border-brand-stroke bg-surface-container-lowest text-brand-ink font-label-md text-label-md font-semibold hover:bg-surface-container-low transition-colors duration-150 active:scale-[0.99] flex items-center gap-2" href="/preview"><span className="">Explore preview</span><span aria-hidden="true" className="material-symbols-outlined text-[18px] text-brand-muted" data-icon="south">south</span></a>
</div>

<div className="w-full max-w-xl bg-surface-container-lowest rounded-2xl border border-brand-stroke p-5 transition-all">
<div className="flex items-center justify-between mb-3">
<span className="text-label-sm font-label-sm uppercase tracking-wider text-brand-muted">Input prompt → 9:16 vertical motion output</span>
</div>
<div className="flex items-center gap-2 bg-surface-container-low rounded-xl border border-brand-stroke p-1.5 focus-within:border-primary-container transition-colors">
<div className="pl-2.5 text-brand-muted">
<span aria-hidden="true" className="material-symbols-outlined text-[20px]" data-icon="edit_note">edit_note</span>
</div>
<select aria-label="Example topic" value={search?"search":"water"} onChange={e=>setSearch(e.target.value==="search")}><option value="water">Explain the water cycle</option><option value="search">Explain linear search</option></select>
<a className="h-[36px] px-3.5 rounded-lg bg-surface-container-lowest border border-brand-stroke text-brand-ink font-label-sm text-label-sm font-semibold hover:bg-surface-container-high transition-colors duration-150 flex items-center gap-1 flex-shrink-0" href="/sign-in"><span className="">Create a video</span><span aria-hidden="true" className="material-symbols-outlined text-[16px] text-primary" data-icon="arrow_forward">arrow_forward</span></a>
</div>

</div>
</div>

<div className="lg:col-span-5 flex flex-col items-center lg:items-end justify-center">

<div className="w-full max-w-[360px] h-[640px] bg-surface-container-lowest border border-brand-stroke rounded-[20px] shadow-[0_4px_24px_-4px_rgba(32,43,39,0.06)] flex flex-col overflow-hidden relative">

<div className="w-full py-1.5 px-3 bg-surface-container-high border-b border-brand-stroke flex items-center justify-between text-label-sm font-label-sm text-brand-muted z-20">
<div className="flex items-center gap-1.5 truncate">
<span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0"></span>
<span className="truncate">Illustrated preview — sample video coming soon</span>
</div>
<span className="text-[10px] text-outline flex-shrink-0 font-mono">v0.9</span>
</div>

<div className="px-3 pt-2.5 pb-2 bg-surface-container-lowest border-b border-brand-stroke flex items-center justify-between z-20">
<div className="flex items-center gap-1.5">
<button className="px-3 py-1 rounded-full text-label-sm font-label-sm bg-brand-ink text-surface-container-lowest font-medium shadow-sm transition-transform active:scale-95" aria-pressed={!search} onClick={()=>setSearch(false)}>
                Water cycle
              </button>
<button className="px-3 py-1 rounded-full text-label-sm font-label-sm bg-surface-container-low text-secondary border border-brand-stroke hover:text-brand-ink transition-colors" aria-pressed={search} onClick={()=>setSearch(true)}>
                Linear search
              </button>
</div>
<span aria-hidden="true" className="material-symbols-outlined text-[18px] text-brand-muted" data-icon="tune">tune</span>
</div>

{search?<SearchDiagram onExpand={()=>dialog.current.showModal()}/>:<StitchIllustration onExpand={()=>dialog.current.showModal()}/>}

<div className="py-1 px-3 bg-surface-container text-center border-t border-brand-stroke"><span className="text-[10px] font-mono text-brand-muted">Topic: Explain {search?"linear search":"the water cycle"} • 9:16 vertical explainer</span></div>
</div>
</div>
</section><section className="pt-8 pb-16 border-t border-brand-stroke" id="how-it-works">

<div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-4">
<div>
<span className="text-label-sm font-label-sm text-primary uppercase tracking-wider font-semibold block mb-2">Synthesis Methodology</span>
<h2 className="text-headline-lg font-headline-lg text-brand-ink tracking-tight">
            One topic. Three simple steps.
          </h2>
</div>
<p className="text-body-md font-body-md text-brand-muted max-w-md">
          A predictable pipeline built to translate raw instructional drafts into highly legible, structured explanations.
        </p>
</div>

<div className="relative grid grid-cols-1 md:grid-cols-3 gap-6"><div className="hidden md:block absolute top-7 left-12 right-12 h-0.5 bg-brand-stroke z-0"></div><div className="relative z-10 bg-surface-container-lowest p-6 rounded-2xl border border-brand-stroke flex flex-col hover:border-outline transition-colors"><div className="flex items-center justify-between mb-5"><div className="w-10 h-10 rounded-xl bg-surface-container-low border border-brand-stroke flex items-center justify-center font-mono font-bold text-brand-ink text-sm">01</div><span aria-hidden="true" className="material-symbols-outlined text-primary text-[22px]" data-icon="edit_note">edit_note</span></div><h3 className="text-headline-md font-headline-md text-brand-ink mb-2 text-lg">1. Share your topic</h3><p className="text-body-md font-body-md text-secondary leading-relaxed mb-4">Type in any concept, lesson, or question in plain language. No complex prompting needed.</p><div className="mt-auto pt-3 border-t border-brand-stroke text-label-sm font-label-sm text-brand-muted font-mono">Step 1: Your topic</div></div><div className="relative z-10 bg-surface-container-lowest p-6 rounded-2xl border border-brand-stroke flex flex-col hover:border-outline transition-colors"><div className="flex items-center justify-between mb-5"><div className="w-10 h-10 rounded-xl bg-surface-container-low border border-brand-stroke flex items-center justify-center font-mono font-bold text-brand-ink text-sm">02</div><span aria-hidden="true" className="material-symbols-outlined text-primary text-[22px]" data-icon="draw">draw</span></div><h3 className="text-headline-md font-headline-md text-brand-ink mb-2 text-lg">2. Clear visual diagrams</h3><p className="text-body-md font-body-md text-secondary leading-relaxed mb-4">Clear step-by-step visuals and diagrams are organized to match the explanation naturally.</p><div className="mt-auto pt-3 border-t border-brand-stroke text-label-sm font-label-sm text-brand-muted font-mono">Step 2: Visual outline</div></div><div className="relative z-10 bg-surface-container-lowest p-6 rounded-2xl border border-brand-stroke flex flex-col hover:border-outline transition-colors"><div className="flex items-center justify-between mb-5"><div className="w-10 h-10 rounded-xl bg-surface-container-low border border-brand-stroke flex items-center justify-center font-mono font-bold text-brand-ink text-sm">03</div><span aria-hidden="true" className="material-symbols-outlined text-primary text-[22px]" data-icon="smartphone">smartphone</span></div><h3 className="text-headline-md font-headline-md text-brand-ink mb-2 text-lg">3. Preview and export</h3><p className="text-body-md font-body-md text-secondary leading-relaxed mb-4">Review the vertical explainer video and share it across classrooms, mobile feeds, or presentations.</p><div className="mt-auto pt-3 border-t border-brand-stroke text-label-sm font-label-sm text-brand-muted font-mono">Step 3: Ready to share</div></div></div>

<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 pt-8 border-t border-brand-stroke">
<div className="flex items-start gap-3">
<div className="mt-1 text-primary">
<span aria-hidden="true" className="material-symbols-outlined text-[20px]" data-icon="schema">schema</span>
</div>
<div>
<h4 className="text-label-md font-label-md text-brand-ink mb-1">Purposeful motion graphics</h4>
<p className="text-body-md font-body-md text-secondary text-sm">
              Every kinetic translation represents a state change, data transition, or spatial relationship—never cosmetic fluff.
            </p>
</div>
</div>
<div className="flex items-start gap-3">
<div className="mt-1 text-primary">
<span aria-hidden="true" className="material-symbols-outlined text-[20px]" data-icon="timer">timer</span>
</div>
<div>
<h4 className="text-label-md font-label-md text-brand-ink mb-1">Synchronized pacing</h4>
<p className="text-body-md font-body-md text-secondary text-sm">
              Narration pauses dynamically during complex schematic reveals to allow cognitive absorption before advancing.
            </p>
</div>
</div>
<div className="flex items-start gap-3">
<div className="mt-1 text-primary">
<span aria-hidden="true" className="material-symbols-outlined text-[20px]" data-icon="closed_caption">closed_caption</span>
</div>
<div>
<h4 className="text-label-md font-label-md text-brand-ink mb-1">Accessible captions</h4>
<p className="text-body-md font-body-md text-secondary text-sm">
              Standard-compliant typography scales with full contrasting backgrounds, supporting sound-off mobile comprehension.
            </p>
</div>
</div>
</div>
</section><dialog ref={dialog} className="demo-dialog"><form method="dialog"><button autoFocus>Close preview</button></form><h2>ChitraBodh Explainer Preview</h2><div className="expanded-canvas">{search?<SearchDiagram/>:<img src="/expanded-water.svg" alt="Illustrated atmospheric water cycle"/>}</div><h3>Example narration</h3><p>{search?"Check each element until the target matches.":"Solar heat turns water into vapor. Cooling forms clouds, and precipitation returns water to the surface."}</p></dialog></div>;}