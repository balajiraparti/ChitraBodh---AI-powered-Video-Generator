import Link from 'next/link';
export default function Library() {
  return <><h1>My videos</h1><section className="empty">
    <svg width="150" height="104" viewBox="0 0 150 104" aria-hidden="true"><rect x="39" y="5" width="72" height="94" rx="13" fill="#fff" stroke="#126b58" strokeWidth="2"/><circle cx="86" cy="32" r="11" fill="#f2c14e"/><path d="M47 76 Q62 48 76 64 T103 51 V88 H47Z" fill="#cee5da"/><path d="M47 80 Q70 61 83 74 T103 70" stroke="#126b58" strokeWidth="2" fill="none"/></svg>
    <h2>Create your first explainer</h2><p>Start with a topic. Your finished videos will appear here.</p>
    <Link className="action" href="/create">Create a video</Link></section></>;
}
export { privatePage as getServerSideProps } from '../server/auth.mjs';
