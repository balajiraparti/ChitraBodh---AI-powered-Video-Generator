import Link from 'next/link';
export default function Preview(){
  return <><h1>Workspace preview</h1><section>
    <h2>My videos</h2><p>In your workspace, each topic stays here while its video is being created.</p>
    <article><h3>The water cycle</h3><p>Sample project · Creating narration</p></article>
    <Link className="action" href="/sign-in">Sign in to create your own</Link>
  </section></>;
}
