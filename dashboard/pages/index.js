import Link from 'next/link';
import { useId, useRef, useState } from 'react';

function WaterCycle() {
  const arrowId=useId();
  return <svg viewBox="0 0 180 178" role="img" aria-label="Sunlight warms a lake. Water vapor rises to a cloud and rain returns to the hills.">
    <defs><marker id={arrowId} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 8 4 0 8" fill="#126b58"/></marker></defs>
    <circle cx="35" cy="36" r="17" fill="#f2c14e"/>
    <path d="M0 132 54 97 85 122 133 79 180 111V178H0Z" fill="#c1d3ad"/>
    <path d="M0 151Q47 111 91 140T180 120V178H0Z" fill="#80ac94"/>
    <path d="M0 154Q44 140 80 155T180 147V178H0Z" fill="#77b9c4"/>
    <path d="M84 55Q78 42 93 39Q100 18 117 33Q137 29 140 46Q151 55 137 59H91Z" fill="white" stroke="#9db9b0"/>
    <g fill="none" stroke="#126b58" strokeWidth="2" markerEnd={`url(#${arrowId})`}><path d="M47 138Q25 95 83 62"/><path d="M120 64 117 85"/></g>
    <g stroke="#43849a" strokeWidth="2"><path d="m132 67-4 9m10-6-4 9"/></g>
  </svg>;
}

function Poster({search}) {
  return <div className="poster" aria-live="polite"><small>Illustrated preview</small><h2>{search?'Linear search':'The water cycle'}</h2>
    {search ? <div className="array" aria-label="Check 4, then 7, then find 2 at index 2">{[4,7,2,9].map((v,i)=><span key={v}>{v}<small>{['×','×','✓',''][i]}</small></span>)}</div> : <WaterCycle/>}
    <p>{search?'Look for 2 from left to right. The third box matches, so the search stops.':'The sun warms the lake. Water rises as vapor, cools into droplets, and returns as rain.'}</p></div>;
}

export default function Home() {
  const dialog = useRef(null);
  const [search, setSearch] = useState(false);
  return <div className="landing"><div className="pitch">
    <h1>Your idea.<br/><em>A clearer picture.</em></h1>
    <p>Turn a topic into a short vertical explainer with moving diagrams, synchronized narration and optional captions.</p>
    <Link className="action" href="/sign-in">Create a video</Link><Link className="tour" href="/preview">Preview the workspace →</Link>
    
  </div><section className="demo" aria-label="Illustrated topic preview">
    <div className="choices">{['Water cycle','Linear search'].map((name,i)=><button key={name} aria-pressed={search === Boolean(i)} onClick={()=>setSearch(Boolean(i))}>{name}</button>)}</div>
    <Poster search={search}/>
    <p className="prompt">Topic · {search?'Explain linear search':'Explain the water cycle'}</p>
    <button className="expand-preview" onClick={()=>dialog.current.showModal()}>Expand preview</button>
    <dialog ref={dialog} className="demo-dialog" aria-label="Expanded illustrated preview">
      <form method="dialog"><button autoFocus>Close preview</button></form><Poster search={search}/>
    </dialog>
  </section><p className="steps">Choose a topic <span>→</span> Generate your video <span>→</span> Preview and share</p></div>;
}
