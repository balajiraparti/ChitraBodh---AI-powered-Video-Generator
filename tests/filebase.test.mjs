import test from 'node:test';
import assert from 'node:assert/strict';
import {artifactStorage, objectStorage} from '../dashboard/server/filebase.mjs';
import {objectStorage as legacyStorage} from '../dashboard/server/r2.mjs';

test('artifact reads and cleanup select the provider recorded at upload', t => {
  const settings = {
    FILEBASE_ENDPOINT:'https://s3.filebase.io', REGION:'auto', FILEBASE_BUCKET:'test',
    FILEBASE_ACCESS_KEY_ID:'test', FILEBASE_SECRET_ACCESS_KEY:'test',
    R2_ACCOUNT_ID:'0'.repeat(32), R2_BUCKET:'legacy-test', R2_ACCESS_KEY_ID:'test', R2_SECRET_ACCESS_KEY:'test'
  };
  const previous = Object.fromEntries(Object.keys(settings).map(key => [key, process.env[key]]));
  Object.assign(process.env, settings);
  t.after(() => {
    for (const [key,value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  assert.equal(artifactStorage({storageProvider:'filebase'}), objectStorage());
  assert.equal(artifactStorage({}), legacyStorage());
  assert.equal(artifactStorage({storageProvider:'r2'}), legacyStorage());
  assert.notEqual(objectStorage(), legacyStorage());
  assert.throws(() => artifactStorage({storageProvider:'unknown'}), /Unknown artifact storage provider/);
});
