const express = require('express');
const { createJob, getJob } = require('../lib/jobs');
const { runJob: defaultRunJob } = require('../lib/jobRunner');

function createGenerateRouter({ runJob = defaultRunJob } = {}) {
  const router = express.Router();

  router.post('/generate', express.json(), (req, res) => {
    const brief = req.body;

    if (!brief?.recipient_name) {
      return res.status(400).json({ error: 'invalid brief: recipient_name is required' });
    }
    if (!Array.isArray(brief.tracks) || brief.tracks.length === 0) {
      return res.status(400).json({ error: 'invalid brief: tracks must be a non-empty array' });
    }

    const job = createJob(brief);

    runJob(job.id, brief, {
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      sunoApiKey: process.env.SUNO_API_KEY
    }).catch(err => console.error(`job ${job.id} crashed:`, err));

    res.status(202).json({ id: job.id, status: job.status });
  });

  router.get('/generate/:id', (req, res) => {
    const job = getJob(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'job not found' });
    }
    res.json(job);
  });

  return router;
}

module.exports = { createGenerateRouter };
