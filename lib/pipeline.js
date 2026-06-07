const Anthropic = require('@anthropic-ai/sdk');
const { parseLyricsResponse } = require('./parseLyrics');

const DEFAULT_SUNO_BASE = 'https://api.suno.com/v0';
const DEFAULT_POLL_INTERVAL_MS = 15000;

const LYRICS_SYSTEM_PROMPT = `You are a songwriter writing lyrics for a deeply personal music gift.
Use the lyric_seeds as raw material, not lines to quote directly.
Write in verses and a chorus. Keep each track to 2-3 minutes of content.
Never use the recipient's name more than once per track.
Avoid forced rhymes — a near-rhyme or no rhyme beats a clunky one.
Output each track exactly as, with the literal word TRACK followed by the
track's number (no brackets around the number) and a colon:
TRACK 1: Song Title Here
(lyrics here)
---
TRACK 2: Next Song Title
(lyrics here)
---`;

async function generateLyrics(brief, { anthropicApiKey, model = 'claude-sonnet-4-6' } = {}) {
  const anthropic = new Anthropic({ apiKey: anthropicApiKey });

  const response = await anthropic.messages.create({
    model,
    max_tokens: 2000,
    system: LYRICS_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: JSON.stringify(brief) }]
  });

  const raw = response.content[0].text;
  return parseLyricsResponse(raw);
}

async function generateMusic(brief, lyricTracks, { sunoApiKey, sunoBase = DEFAULT_SUNO_BASE } = {}) {
  const requests = brief.tracks.map((track, i) => {
    const lyrics = lyricTracks[i]?.lyrics ?? '';
    return fetch(`${sunoBase}/audio`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sunoApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: track.title,
        lyrics,
        style: track.suno_style_tags
      })
    })
      .then(async r => {
        const body = await r.text();
        if (!r.ok) {
          throw new Error(`Suno generate request for "${track.title}" failed: ${r.status} ${r.statusText} — ${body}`);
        }
        const data = JSON.parse(body);
        if (!data.id) {
          throw new Error(`Suno generate request for "${track.title}" returned no id — ${body}`);
        }
        return { title: track.title, id: data.id };
      });
  });

  return Promise.all(requests);
}

async function pollUntilDone(tasks, {
  sunoApiKey,
  sunoBase = DEFAULT_SUNO_BASE,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
  onUpdate
} = {}) {
  const remaining = new Map(tasks.map(t => [t.id, t.title]));
  const results = [];

  while (remaining.size > 0) {
    await new Promise(r => setTimeout(r, pollIntervalMs));

    for (const [id, title] of remaining) {
      const res = await fetch(`${sunoBase}/audio/${id}`, {
        headers: { Authorization: `Bearer ${sunoApiKey}` }
      });
      const body = await res.text();
      if (!res.ok) {
        throw new Error(`Suno poll request for "${title}" (${id}) failed: ${res.status} ${res.statusText} — ${body}`);
      }
      const data = JSON.parse(body);

      if (data.status === 'complete') {
        results.push({ title, id, audio_url: data.audio_url });
        remaining.delete(id);
        onUpdate?.({ title, id, status: data.status, audio_url: data.audio_url });
      } else if (data.error) {
        remaining.delete(id);
        onUpdate?.({ title, id, status: 'error', error: data.error });
      } else {
        onUpdate?.({ title, id, status: data.status, audio_url: data.audio_url });
      }
    }
  }

  return results;
}

async function runPipeline(brief, config = {}) {
  const lyricTracks = await generateLyrics(brief, config);
  const tasks = await generateMusic(brief, lyricTracks, config);
  return pollUntilDone(tasks, config);
}

module.exports = { generateLyrics, generateMusic, pollUntilDone, runPipeline };
