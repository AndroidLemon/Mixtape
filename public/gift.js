const POLL_INTERVAL_MS = 5000;

const STATUS_MESSAGES = {
  pending: 'Getting started…',
  generating_lyrics: 'Writing the lyrics…',
  generating_music: 'Sending it off to be recorded…',
  polling: 'The tracks are being mixed…',
  complete: 'Your mixtape is ready.',
  error: 'Something went wrong putting this mixtape together.'
};

const heading = document.getElementById('heading');
const statusEl = document.getElementById('status');
const tracksEl = document.getElementById('tracks');

const id = new URLSearchParams(location.search).get('id');

function render(job) {
  heading.textContent = job.brief?.recipient_name
    ? `A mixtape for ${job.brief.recipient_name}`
    : 'Your mixtape';

  statusEl.textContent = STATUS_MESSAGES[job.status] || job.status;
  if (job.status === 'error' && job.error) {
    statusEl.textContent += ` (${job.error})`;
  }

  tracksEl.innerHTML = '';
  for (const track of job.tracks || []) {
    const li = document.createElement('li');
    li.className = 'track';

    const title = document.createElement('span');
    title.className = 'track-title';
    title.textContent = track.title;
    li.appendChild(title);

    if (track.status === 'complete' && track.audio_url) {
      // Suno's files are .m4a (AAC in an MP4 container) once complete — don't
      // hardcode an audio/mpeg type, let the browser sniff the real format.
      const audio = document.createElement('audio');
      audio.controls = true;
      audio.src = track.audio_url;
      li.appendChild(audio);
    } else {
      const trackStatus = document.createElement('span');
      trackStatus.className = 'track-status';
      trackStatus.textContent = track.status;
      li.appendChild(trackStatus);
    }

    tracksEl.appendChild(li);
  }
}

async function poll() {
  const res = await fetch(`/generate/${id}`);
  if (!res.ok) {
    heading.textContent = 'Mixtape not found';
    statusEl.textContent = 'This link doesn’t point to a mixtape we know about.';
    return;
  }

  const job = await res.json();
  render(job);

  if (job.status !== 'complete' && job.status !== 'error') {
    setTimeout(poll, POLL_INTERVAL_MS);
  }
}

if (!id) {
  heading.textContent = 'Mixtape not found';
  statusEl.textContent = 'No mixtape id was provided in the link.';
} else {
  poll();
}
