// pipeline.js
// Hardcoded test brief → lyrics → Suno → poll → print URLs
// Run: SUNO_API_KEY=x ANTHROPIC_API_KEY=x node pipeline.js

const Anthropic = require('@anthropic-ai/sdk');
const { parseLyricsResponse } = require('./lib/parseLyrics');

const SUNO_KEY = process.env.SUNO_API_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const SUNO_BASE = 'https://api.sunoapi.org/api/v1';
const MODEL = 'V4_5PLUS';
const POLL_INTERVAL_MS = 15000;

const TEST_BRIEF = {
  recipient_name: 'Rachel',
  occasion: 'first birthday',
  shape: 'moment',
  emotional_arc: ['warm', 'safe', 'joyful', 'loved'],
  shared_memories: [
    'first steps',
    'first cake smash',
    'first fall',
    'legos on the floor — a home full of life and noise'
  ],
  their_taste: [],
  avoid: ['anything that feels unsafe or unsettling'],
  tape_color: 'red',
  tracks: [
    {
      title: 'First Steps',
      mood: 'wobbly, courageous, delighted',
      lyric_seeds: ['one foot then the other', 'the whole room holding its breath', 'she did it'],
      suno_style_tags: 'warm indie pop, acoustic guitar, gentle drums, playful, tender'
    },
    {
      title: 'Cake Smash',
      mood: 'pure joyful chaos, uninhibited',
      lyric_seeds: ['hands in the frosting', 'laughing too hard to sing', 'this is what happy looks like'],
      suno_style_tags: 'upbeat folk pop, clapping rhythm, bright piano, celebratory, warm'
    },
    {
      title: 'Legos on the Floor',
      mood: 'alive, homey, beautifully imperfect',
      lyric_seeds: ['the mess we made together', 'every corner full of something', 'this is home'],
      suno_style_tags: 'warm indie folk, fingerpicked guitar, soft vocals, cozy, lived-in'
    },
    {
      title: 'First Fall',
      mood: 'tender, reassuring, you are not alone',
      lyric_seeds: ["I caught you", "it's okay to stumble", "I'll always be here"],
      suno_style_tags: 'soft acoustic, gentle strings, comforting, intimate, safe'
    },
    {
      title: 'You Are Loved',
      mood: 'still, warm, eternal — the closing embrace',
      lyric_seeds: ['from the very beginning', 'before you knew the words', 'you were loved'],
      suno_style_tags: 'ambient folk, soft piano, warm pads, tender, resolving'
    }
  ]
};

async function generateLyrics(brief) {
  console.log('\n[1/3] Generating lyrics...');
  const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY });

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    system: `You are a songwriter writing lyrics for a deeply personal music gift.
Use the lyric_seeds as raw material, not lines to quote directly.
Write in verses and a chorus. Keep each track to 2-3 minutes of content.
Never use the recipient's name more than once per track.
Avoid forced rhymes — a near-rhyme or no rhyme beats a clunky one.
Output each track exactly as:
TRACK [n]: [title]
[lyrics]
---`,
    messages: [{ role: 'user', content: JSON.stringify(brief) }]
  });

  const raw = response.content[0].text;
  const tracks = parseLyricsResponse(raw);

  console.log(`   Generated lyrics for ${tracks.length} tracks`);
  return tracks;
}

async function generateMusic(brief, lyricTracks) {
  console.log('\n[2/3] Sending to Suno...');

  const requests = brief.tracks.map((track, i) => {
    const lyrics = lyricTracks[i]?.lyrics ?? '';
    return fetch(`${SUNO_BASE}/generate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUNO_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        customMode: true,
        instrumental: false,
        model: MODEL,
        title: track.title,
        style: track.suno_style_tags,
        prompt: lyrics
      })
    })
      .then(r => r.json())
      .then(data => {
        const taskId = data.data.taskId;
        console.log(`   Track "${track.title}" → taskId: ${taskId}`);
        return { title: track.title, taskId };
      });
  });

  return Promise.all(requests);
}

async function pollUntilDone(tasks) {
  console.log('\n[3/3] Polling for completion...');
  const remaining = new Map(tasks.map(t => [t.taskId, t.title]));
  const results = [];

  while (remaining.size > 0) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));

    for (const [taskId, title] of remaining) {
      const res = await fetch(
        `${SUNO_BASE}/generate/record-info?taskId=${taskId}`,
        { headers: { Authorization: `Bearer ${SUNO_KEY}` } }
      );
      const data = await res.json();
      const status = data.data.status;

      if (status === 'SUCCESS') {
        const variations = data.data.response.data;
        console.log(`   ✓ "${title}" complete — ${variations.length} variations`);
        results.push({ title, taskId, variations });
        remaining.delete(taskId);
      } else if (status === 'GENERATING') {
        console.log(`   … "${title}" still generating`);
      } else {
        console.error(`   ✗ "${title}" failed: ${status}`);
        remaining.delete(taskId);
      }
    }
  }

  return results;
}

async function run() {
  console.log('=== Mixtape POC Pipeline ===');

  if (!SUNO_KEY || !ANTHROPIC_KEY) {
    console.error('Missing SUNO_API_KEY or ANTHROPIC_API_KEY in environment');
    process.exit(1);
  }

  const lyricTracks = await generateLyrics(TEST_BRIEF);
  const tasks = await generateMusic(TEST_BRIEF, lyricTracks);
  const results = await pollUntilDone(tasks);

  console.log('\n=== Results ===');
  for (const track of results) {
    console.log(`\n${track.title}`);
    track.variations.forEach((v, i) => {
      console.log(`  Variation ${i + 1}: ${v.audio_url}`);
      console.log(`  Duration: ${v.duration}s`);
    });
  }
}

run().catch(console.error);
