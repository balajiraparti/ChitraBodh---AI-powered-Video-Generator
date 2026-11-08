import test from 'node:test';
import assert from 'node:assert/strict';
import { memoryAdapter } from 'better-auth/adapters/memory';
import { makeAuth } from '../dashboard/server/auth-core.mjs';

test('email/password registration, sign-in and session revocation',async()=>{
  const origin='http://localhost:3000';
  const auth=makeAuth({database:memoryAdapter({user:[],account:[],session:[],verification:[]}),
    baseURL:origin,secret:'local-test-only-secret-with-more-than-32-characters'});
  const registered=await auth.api.signUpEmail({headers:new Headers({origin}),body:{email:'creator@example.test',password:'correct-horse-battery-staple',name:'Creator'},asResponse:true});
  const cookie=registered.headers.getSetCookie().map(x=>x.split(';')[0]).join('; ');
  const headers=new Headers({cookie,origin});
  assert.equal((await auth.api.getSession({headers})).user.email,'creator@example.test');
  await auth.api.signOut({headers});
  assert.equal(await auth.api.getSession({headers}),null);
  const signedIn=await auth.api.signInEmail({headers:new Headers({origin}),body:{email:'creator@example.test',password:'correct-horse-battery-staple'},asResponse:true});
  assert.ok(signedIn.headers.getSetCookie().length>0);
  await assert.rejects(()=>auth.api.signInEmail({headers:new Headers({origin}),body:{email:'creator@example.test',password:'wrong-password'}}));
});
