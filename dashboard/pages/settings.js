export default function Settings() {
  return <><h1>Settings</h1><section><h2>Video preferences</h2><p>Narrator and caption defaults will be available here.</p></section><form method="post" action="/api/auth/sign-out"><button type="submit">Sign out</button></form></>;
}
export { privatePage as getServerSideProps } from '../server/auth.mjs';
