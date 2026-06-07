const crypto = require('node:crypto');

let jobs = new Map();

function createJob(brief) {
  const job = {
    id: crypto.randomUUID(),
    status: 'pending',
    brief,
    tracks: null,
    error: null,
    createdAt: new Date().toISOString()
  };
  jobs.set(job.id, job);
  return job;
}

function getJob(id) {
  return jobs.get(id);
}

function updateJob(id, patch) {
  const job = { ...jobs.get(id), ...patch };
  jobs.set(id, job);
  return job;
}

function _reset() {
  jobs = new Map();
}

module.exports = { createJob, getJob, updateJob, _reset };
