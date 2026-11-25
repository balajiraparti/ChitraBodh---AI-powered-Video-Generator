import test from 'node:test';
import assert from 'node:assert/strict';
import {deploymentEnvironment,deploymentCommand} from '../deploy/runtime.mjs';
test('Render derives matching OAuth/auth origins while preserving secrets and local settings',()=>{
 const env=deploymentEnvironment({RENDER_EXTERNAL_URL:'https://pilot.onrender.com',BETTER_AUTH_URL:'https://old.invalid',INSTAGRAM_REDIRECT_URI:'https://old.invalid/callback',INSTAGRAM_TOKEN_KEY:'keep-private'});
 assert.equal(env.BETTER_AUTH_URL,'https://pilot.onrender.com');assert.equal(env.INSTAGRAM_REDIRECT_URI,'https://pilot.onrender.com/api/v1/instagram/callback');assert.equal(env.INSTAGRAM_TOKEN_KEY,'keep-private');
 assert.equal(deploymentEnvironment({CHITRABODH_PUBLIC_URL:'https://app.example.com',RENDER_EXTERNAL_URL:'https://pilot.onrender.com'}).BETTER_AUTH_URL,'https://app.example.com');
 for(const url of ['http://localhost','https://user:password@example.com','https://example.com/callback','https://example.com?key=secret','https://example.com/#hash'])assert.throws(()=>deploymentEnvironment({CHITRABODH_PUBLIC_URL:url}));
 assert.throws(()=>deploymentEnvironment({}));
});
test('deployment commands expose only the web service and preserve one-shot cleanup',()=>{
 assert.deepEqual(deploymentCommand('web','3210'),['node_modules/next/dist/bin/next','start','dashboard','--hostname','0.0.0.0','--port','3210']);
 assert.deepEqual(deploymentCommand('cleanup'),['--import','tsx','scripts/media-cleanup.mjs','--once']);
 for(const role of ['generation','storyboard','publishing'])assert.equal(deploymentCommand(role)[0],'--import');
 assert.throws(()=>deploymentCommand('shell'));assert.throws(()=>deploymentCommand('web','0'));assert.throws(()=>deploymentCommand('web','10000;echo secret'));
});
