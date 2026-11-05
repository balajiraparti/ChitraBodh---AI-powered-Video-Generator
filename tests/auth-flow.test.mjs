import test from 'node:test';
import assert from 'node:assert/strict';
import { memoryAdapter } from 'better-auth/adapters/memory';
import { makeAuth } from '../dashboard/server/auth-core.mjs';

test('invitation, one-use link, session revocation and invite removal',async()=>{
  const inbox=[];
  const origin='http://localhost:3000';
  const allowed=new Set(['team@example.test']);
  const auth=makeAuth({database:memoryAdapter({user:[],account:[],session:[],verification:[]}),
    baseURL:origin,secret:'local-test-only-secret-with-more-than-32-characters',
    invited:async email=>allowed.has(email),deliver:async(email,url)=>inbox.push(url)});
  const send=email=>auth.api.signInMagicLink({headers:new Headers({origin}),body:{email,callbackURL:'/dashboard',errorCallbackURL:'/sign-in'}});
  await send('unknown@example.test');
  assert.equal(inbox.length,0);
  await send('team@example.test');
  const url=inbox.pop();
  const verified=await auth.handler(new Request(url));
  assert.match(verified.headers.get('location'),/dashboard$/);
  const cookie=verified.headers.getSetCookie().map(x=>x.split(';')[0]).join('; ');
  const headers=new Headers({cookie,origin});
  assert.equal((await auth.api.getSession({headers})).user.email,'team@example.test');
  const replay=await auth.handler(new Request(url));
  assert.match(replay.headers.get('location'),/INVALID_TOKEN/);
  await auth.api.signOut({headers});
  assert.equal(await auth.api.getSession({headers}),null);
  await send('team@example.test');
  allowed.clear();
  const revoked=await auth.handler(new Request(inbox.pop()));
  assert.equal(revoked.headers.getSetCookie().length,0);
});
