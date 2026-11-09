import test from 'node:test';
import assert from 'node:assert/strict';
import {createPage} from '../dashboard/server/create-page.mjs';

function collection(rows) {
  return {findOne: async query => rows.find(row =>
    Object.entries(query).every(([field, value]) => row[field] === value)
  ) ?? null};
}

test('explicit library and expired-video links keep their destination during an unrelated job', async () => {
  const active = {_id:'running', ownerId:'creator', active:true};
  const jobs = [active, {_id:'original', ownerId:'creator', state:'succeeded', versionId:'v1'}];
  const store = {
    jobs: collection(jobs),
    projects: collection([{_id:'selected', ownerId:'creator', status:'draft', topic:'Binary search'}]),
    versions: collection([{_id:'v1', ownerId:'creator', topic:'Water cycle',
      settingsSnapshot:{voiceCatalogId:'adam', captions:false}}])
  };
  const open = query => createPage(store, 'creator', query);
  assert.equal((await open({})).redirect.destination, '/jobs/running');
  const draft = (await open({draft:'selected'})).props;
  assert.equal(draft.initial.topic, 'Binary search');
  assert.equal(draft.activeJobId, 'running');
  const {seed, activeJobId} = (await open({fromJob:'original'})).props;
  assert.deepEqual(seed, {sourceJobId:'original', topic:'Water cycle', voiceCatalogId:'adam', captions:false});
  assert.equal(activeJobId, 'running');
  assert.deepEqual(await createPage(store, 'other', {fromJob:'original'}), {notFound:true});
  active.active = false;
  const reopened = (await open({fromJob:'original'})).props;
  assert.deepEqual(reopened.seed, seed);
  assert.equal(reopened.activeJobId, null);
});
