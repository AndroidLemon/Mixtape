const test = require('node:test');
const assert = require('node:assert');
const { createJob, getJob, updateJob, _reset } = require('./jobs');

test.beforeEach(() => _reset());

test('createJob generates an id, stores the brief, and starts pending', () => {
  const brief = { recipient_name: 'Rachel', tracks: [] };
  const job = createJob(brief);

  assert.strictEqual(typeof job.id, 'string');
  assert.ok(job.id.length > 0);
  assert.strictEqual(job.status, 'pending');
  assert.deepStrictEqual(job.brief, brief);
  assert.strictEqual(job.tracks, null);
  assert.strictEqual(job.error, null);
  assert.strictEqual(typeof job.createdAt, 'string');
});

test('createJob assigns a unique id to each job', () => {
  const a = createJob({ recipient_name: 'A', tracks: [] });
  const b = createJob({ recipient_name: 'B', tracks: [] });
  assert.notStrictEqual(a.id, b.id);
});

test('getJob returns the stored job by id', () => {
  const created = createJob({ recipient_name: 'Rachel', tracks: [] });
  const found = getJob(created.id);
  assert.deepStrictEqual(found, created);
});

test('getJob returns undefined for an unknown id', () => {
  assert.strictEqual(getJob('does-not-exist'), undefined);
});

test('updateJob shallow-merges a patch into the stored job and returns it', () => {
  const created = createJob({ recipient_name: 'Rachel', tracks: [] });
  const updated = updateJob(created.id, { status: 'generating_lyrics' });

  assert.strictEqual(updated.status, 'generating_lyrics');
  assert.strictEqual(updated.id, created.id);
  assert.deepStrictEqual(updated.brief, created.brief);
  assert.deepStrictEqual(getJob(created.id), updated);
});

test('updateJob overwrites only the patched fields, leaving others intact', () => {
  const created = createJob({ recipient_name: 'Rachel', tracks: [] });
  updateJob(created.id, { status: 'polling', tracks: [{ title: 'A', status: 'submitted' }] });
  const updated = updateJob(created.id, { status: 'complete' });

  assert.strictEqual(updated.status, 'complete');
  assert.deepStrictEqual(updated.tracks, [{ title: 'A', status: 'submitted' }]);
});
