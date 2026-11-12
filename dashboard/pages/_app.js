import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import './shell.css';
import './stitch-utilities.css';
import './daylight.css';

const destinations = [['/dashboard', 'My videos'], ['/create', 'Create video'], ['/settings', 'Settings']];
export default function Workspace({ Component, pageProps }) {
  const { pathname } = useRouter();
  const publicPage = ['/', '/preview', '/sign-in'].includes(pathname);
  const current = destinations.find(([url]) => url === pathname);
  return <div id="daylight">
    <Head><title>{current?.[1] || (pathname === '/sign-in' ? 'Sign in' : 'Educational explainers')} · Chitrabodh</title><link rel="icon" type="image/svg+xml" href="/favicon.svg" /><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
    <a className="skip" href="#content">Skip to content</a>
    <header><Link className="brand" href="/"><img src="/moving-chitra.svg" width="54" height="40" alt="" />Chitrabodh</Link>{!publicPage && <span className="studio-tag">Studio</span>}
      {publicPage && pathname !== '/sign-in' && <div className="entry"><Link href="/sign-in">Sign in</Link></div>}
      {!publicPage && <nav aria-label="Workspace">{destinations.map(([url, label]) =>
        <Link key={url} href={url} aria-current={pathname === url ? 'page' : undefined}>{label}</Link>)}</nav>}{!publicPage && <Link className="account-link" href="/settings">Account settings</Link>}
    </header>
    <main data-route={pathname} id="content" tabIndex={-1}><Component {...pageProps} /></main><footer className="studio-footer">ChitraBodh · Ideas in motion. Made clear.</footer>
  </div>;
}

