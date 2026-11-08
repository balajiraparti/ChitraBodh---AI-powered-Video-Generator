import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import './shell.css';

const destinations = [['/dashboard', 'My videos'], ['/create', 'Create'], ['/settings', 'Settings']];
export default function Workspace({ Component, pageProps }) {
  const { pathname } = useRouter();
  const publicPage = ['/', '/preview', '/sign-in'].includes(pathname);
  const current = destinations.find(([url]) => url === pathname);
  return <>
    <Head><title>{current?.[1] || (pathname === '/sign-in' ? 'Sign in' : 'Educational explainers')} · Chitrabodh</title><link rel="icon" type="image/svg+xml" href="/favicon.svg" /><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
    <a className="skip" href="#content">Skip to content</a>
    <header><Link className="brand" href="/"><img src="/moving-chitra.svg" width="54" height="40" alt="" />Chitrabodh</Link>
      {publicPage && pathname !== '/sign-in' && <div className="entry"><span>Invite-only pilot</span><Link href="/sign-in">Sign in</Link></div>}
      {!publicPage && <nav aria-label="Workspace">{destinations.map(([url, label]) =>
        <Link key={url} href={url} aria-current={pathname === url ? 'page' : undefined}>{label}</Link>)}</nav>}
    </header>
    <main id="content" tabIndex={-1}><Component {...pageProps} /></main>
  </>;
}

