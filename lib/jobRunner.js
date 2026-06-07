const { generateLyrics, generateMusic, pollUntilDone } = require('./pipeline');
const { getJob, updateJob } = require('./jobs');

async function runJob(jobId, brief, config = {}) {
  updateJob(jobId, { status: 'generating_lyrics' });

  try {
    const lyricTracks = await generateLyrics(brief, config);

    updateJob(jobId, { status: 'generating_music' });
    const tasks = await generateMusic(brief, lyricTracks, config);

    updateJob(jobId, {
      status: 'polling',
      tracks: tasks.map(t => ({ title: t.title, status: 'submitted' }))
    });

    const results = await pollUntilDone(tasks, {
      ...config,
      onUpdate: (task) => {
        if (task.status === 'complete' || task.status === 'error') return;
        const job = getJob(jobId);
        const tracks = job.tracks.map(t => (t.title === task.title ? { ...t, status: task.status } : t));
        updateJob(jobId, { tracks });
      }
    });

    updateJob(jobId, {
      status: 'complete',
      tracks: results.map(r => ({ title: r.title, status: 'complete', audio_url: r.audio_url }))
    });
  } catch (err) {
    updateJob(jobId, { status: 'error', error: err.message });
  }
}

module.exports = { runJob };
