const test = require('node:test');
const assert = require('node:assert');
const express = require('express');
const { createGenerateRouter } = require('./generate');
const { getJob, updateJob, _reset } = require('../lib/jobs');

const VALID_BRIEF = {
  recipient_name: 'Rachel',
  occasion: 'first birthday',
  shape: 'moment',
  tracks: [{ title: 'First Steps', mood: 'warm', lyric_seeds: [], suno_style_tags: 'indie pop' }]
};

function startServer(runJob) {
  const app = express();
  app.use(createGenerateRouter({ runJob }));
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve(server));
  });
}

function stopServer(server) {
  return new Promise((resolve) => server.close(resolve));
}

test.beforeEach(() => _reset());

test('POST /generate rejects a brief with no recipient_name', async () => {
  const server = await startServer(async () => {});
  try {
    const { port } = server.address();
    const res = await fetch(`http://localhost:${port}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tracks: [{ title: 'X' }] })
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /recipient_name/);
  } finally {
    await stopServer(server);
  }
});

test('POST /generate rejects a brief with empty tracks', async () => {
  const server = await startServer(async () => {});
  try {
    const { port } = server.address();
    const res = await fetch(`http://localhost:${port}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient_name: 'Rachel', tracks: [] })
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /tracks/);
  } finally {
    await stopServer(server);
  }
});

test('POST /generate creates a pending job and returns 202 immediately without awaiting runJob', async () => {
  let resolveRunJob;
  const runJobStarted = new Promise((resolve) => { resolveRunJob = resolve; });
  const runJob = async (jobId, brief) => {
    resolveRunJob({ jobId, brief });
    await new Promise(() => {}); // never resolves — proves the route doesn't await us
  };

  const server = await startServer(runJob);
  try {
    const { port } = server.address();
    const res = await fetch(`http://localhost:${port}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(VALID_BRIEF)
    });
    assert.strictEqual(res.status, 202);
    const body = await res.json();
    assert.strictEqual(typeof body.id, 'string');
    assert.strictEqual(body.status, 'pending');

    const job = getJob(body.id);
    assert.ok(job, 'job should be stored');
    assert.deepStrictEqual(job.brief, VALID_BRIEF);

    const { jobId, brief } = await runJobStarted;
    assert.strictEqual(jobId, body.id);
    assert.deepStrictEqual(brief, VALID_BRIEF);
  } finally {
    await stopServer(server);
  }
});

test('GET /generate/:id returns the stored job', async () => {
  const server = await startServer(async () => {});
  try {
    const { port } = server.address();
    const createRes = await fetch(`http://localhost:${port}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(VALID_BRIEF)
    });
    const { id } = await createRes.json();
    updateJob(id, { status: 'complete', tracks: [{ title: 'First Steps', status: 'complete', audio_url: 'https://cdn1.suno.ai/x.m4a' }] });

    const res = await fetch(`http://localhost:${port}/generate/${id}`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.id, id);
    assert.strictEqual(body.status, 'complete');
    assert.strictEqual(body.tracks[0].audio_url, 'https://cdn1.suno.ai/x.m4a');
  } finally {
    await stopServer(server);
  }
});

test('GET /generate/:id returns 404 for an unknown id', async () => {
  const server = await startServer(async () => {});
  try {
    const { port } = server.address();
    const res = await fetch(`http://localhost:${port}/generate/does-not-exist`);
    assert.strictEqual(res.status, 404);
  } finally {
    await stopServer(server);
  }
});
