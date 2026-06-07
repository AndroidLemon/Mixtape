# Pipeline POC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Get `pipeline.js` running end-to-end against real Anthropic + Suno API keys, proving the brief → lyrics → music → audio-URL pipeline works, per the "Immediate task for Claude Code" in `MIXTAPE_CONTEXT.md`.

**Architecture:** A single CommonJS script (`pipeline.js`, matching the existing `"type": "commonjs"` in `package.json`) drives three stages — lyrics generation via the Anthropic SDK, music generation via the Suno REST API, and polling until tracks complete — using a hardcoded test brief (the "Rachel" example from `MIXTAPE_CONTEXT.md`). The lyrics-response parsing logic is the one piece of pure business logic in the script, so it's extracted into `lib/parseLyrics.js` and unit tested; the rest is an integration script whose real "test" is a live run against both APIs (per the brief: "Run it — fix whatever breaks... Once you have audio URLs printing to console, the POC is proved").

**Tech Stack:** Node.js (CommonJS), `@anthropic-ai/sdk`, native `fetch`, Node's built-in test runner (`node --test`, already wired up in `package.json`).

---

## Important context for the engineer

- `package.json` currently has `"type": "commonjs"` and `index.js` uses `require(...)`. The `pipeline.js` draft in `MIXTAPE_CONTEXT.md` uses ESM `import` syntax — **do not copy it verbatim**. This plan rewrites it to CommonJS `require(...)` so it matches the rest of the project and avoids module-system conflicts.
- The Rachel test brief (the JSON to hardcode into `TEST_BRIEF`) is fully spelled out in `MIXTAPE_CONTEXT.md` lines 69–116 and reproduced in Task 3 below.
- Run command: `SUNO_API_KEY=<key> ANTHROPIC_API_KEY=<key> node pipeline.js`
- Suno reference facts (corrected — see `[Berklee Hackathon 2026] External API Quick Start.md`, the actual hackathon proxy spec; `MIXTAPE_CONTEXT.md` originally pointed at the wrong, incompatible `api.sunoapi.org` service, which this plan's implementation does **not** use):
  - Base URL `https://api.suno.com/v0`, auth header `Authorization: Bearer <key>`
  - `POST /audio` with `{ title, lyrics, style }` kicks off a generation job and returns `{ id, status }`
  - `GET /audio/{id}` polls status; values include `submitted`, `streaming`, `complete`, or an error
  - On `complete`, the response contains a single `audio_url` per track (not multiple variations)

---

## Task 1: Add the Anthropic SDK dependency

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Install the SDK**

Run: `npm install @anthropic-ai/sdk`

- [ ] **Step 2: Verify it landed in package.json**

Run: `grep '"@anthropic-ai/sdk"' package.json`
Expected: a line like `"@anthropic-ai/sdk": "^0.x.x"` under `"dependencies"`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @anthropic-ai/sdk dependency for pipeline POC"
```

---

## Task 2: Extract and test the lyrics-response parser

The Claude lyrics call returns one big string shaped like:

```
TRACK 1: First Steps
[lyrics for track 1]
---
TRACK 2: Cake Smash
[lyrics for track 2]
---
```

Splitting that into `{ title, lyrics }` objects is the one piece of pure logic in the pipeline — pull it into its own module so it can be unit tested without hitting any API.

**Files:**
- Create: `lib/parseLyrics.js`
- Test: `lib/parseLyrics.test.js`

- [ ] **Step 1: Write the failing test**

Create `lib/parseLyrics.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert');
const { parseLyricsResponse } = require('./parseLyrics');

test('splits multiple TRACK blocks on the --- separator', () => {
  const raw = [
    'TRACK 1: First Steps',
    'One foot then the other',
    'The whole room holding its breath',
    '---',
    'TRACK 2: Cake Smash',
    'Hands in the frosting',
    '---'
  ].join('\n');

  const tracks = parseLyricsResponse(raw);

  assert.strictEqual(tracks.length, 2);
  assert.strictEqual(tracks[0].title, 'First Steps');
  assert.strictEqual(tracks[0].lyrics, 'One foot then the other\nThe whole room holding its breath');
  assert.strictEqual(tracks[1].title, 'Cake Smash');
  assert.strictEqual(tracks[1].lyrics, 'Hands in the frosting');
});

test('strips the "TRACK n:" prefix and trims surrounding whitespace', () => {
  const raw = [
    'TRACK 3:   Legos on the Floor   ',
    '',
    'The mess we made together',
    '',
    '---',
    '   '
  ].join('\n');

  const tracks = parseLyricsResponse(raw);

  assert.strictEqual(tracks.length, 1);
  assert.strictEqual(tracks[0].title, 'Legos on the Floor');
  assert.strictEqual(tracks[0].lyrics, 'The mess we made together');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test lib/parseLyrics.test.js`
Expected: FAIL — `Cannot find module './parseLyrics'`

- [ ] **Step 3: Write the minimal implementation**

Create `lib/parseLyrics.js`:

```js
function parseLyricsResponse(raw) {
  const tracks = [];
  const blocks = raw.split('---').filter(b => b.trim());

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    const titleLine = lines[0];
    const lyrics = lines.slice(1).join('\n').trim();
    const title = titleLine.replace(/^TRACK \d+:\s*/i, '').trim();
    tracks.push({ title, lyrics });
  }

  return tracks;
}

module.exports = { parseLyricsResponse };
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test lib/parseLyrics.test.js`
Expected: PASS — both tests green

- [ ] **Step 5: Commit**

```bash
git add lib/parseLyrics.js lib/parseLyrics.test.js
git commit -m "feat: extract and test lyrics-response parser for pipeline"
```

---

## Task 3: Write pipeline.js

This wires the three stages together: generate lyrics with Claude, fire off Suno generation requests, poll until every track completes, then print the resulting audio URLs. It's adapted from the draft in `MIXTAPE_CONTEXT.md` — converted to CommonJS `require(...)` (to match `"type": "commonjs"`) and using the `parseLyricsResponse` helper from Task 2 instead of inline parsing.

**Files:**
- Create: `pipeline.js`

- [ ] **Step 1: Write the file**

Create `pipeline.js`:

```js
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
```

- [ ] **Step 2: Syntax-check the file (no API calls yet)**

Run: `node --check pipeline.js`
Expected: no output (exit code 0) — confirms the file parses as valid CommonJS

- [ ] **Step 3: Commit**

```bash
git add pipeline.js
git commit -m "feat: add pipeline.js — lyrics → Suno → poll, hardcoded Rachel brief"
```

---

## Task 4: Run the pipeline against live APIs and fix what breaks

This is the actual proof of the POC — there's no way to unit-test "does Claude's lyrics format match our parser" or "does Suno's response shape match our field access" without hitting the real services. Run it, read the output carefully, and adjust based on what comes back. The fixes below are the most likely failure points based on the API reference notes in `MIXTAPE_CONTEXT.md`; apply whichever ones actually occur.

**Files:**
- Modify: `pipeline.js` (only the specific lines that turn out to be wrong)

- [ ] **Step 1: Run it**

Run: `SUNO_API_KEY=<your-suno-key> ANTHROPIC_API_KEY=<your-anthropic-key> node pipeline.js`

Expect this to take several minutes (lyrics generation, then Suno generation + 15s-interval polling for 5 tracks).

- [ ] **Step 2: If the Anthropic call throws "Anthropic is not a constructor" or similar**

The SDK's CJS export shape varies by version. In `pipeline.js`, change:

```js
const Anthropic = require('@anthropic-ai/sdk');
```

to:

```js
const { Anthropic } = require('@anthropic-ai/sdk');
```

(or `require('@anthropic-ai/sdk').default` if that's what `console.log(require('@anthropic-ai/sdk'))` shows). Re-run.

- [ ] **Step 3: If the Anthropic call throws a "model not found" / 404 error**

The hardcoded `model: 'claude-sonnet-4-20250514'` snapshot may no longer be available on the account's API access. Replace it with `model: 'claude-sonnet-4-6'` (the current Sonnet alias) in the `generateLyrics` function in `pipeline.js`. Re-run.

- [ ] **Step 4: If lyrics parsing produces 0 tracks or garbled titles/lyrics**

Add a temporary debug line right after `const raw = response.content[0].text;` in `generateLyrics`:

```js
console.log('--- RAW LYRICS RESPONSE ---\n' + raw + '\n--- END ---');
```

Re-run, inspect how Claude actually formatted its output (e.g. it may have wrapped tracks in markdown fences, or used `Track 1:` instead of `TRACK 1:`), and adjust either:
- the `system` prompt in `generateLyrics` to be more explicit about the exact output format, or
- the regex/split logic in `lib/parseLyrics.js` (update its test in `lib/parseLyrics.test.js` to match the new real-world format, then re-run `node --test lib/parseLyrics.test.js`)

Remove the debug `console.log` once parsing is correct.

- [ ] **Step 5: If `generateMusic` throws reading `data.data.taskId`**

Add a debug line in the `.then(data => {...})` callback inside `generateMusic`:

```js
.then(data => {
  console.log('--- SUNO GENERATE RESPONSE ---', JSON.stringify(data));
  const taskId = data.data.taskId;
  ...
```

Re-run, find the actual key path for the task identifier in the logged JSON (it may be `data.taskId`, `data.data.task_id`, etc.), and update the `const taskId = ...` line in `pipeline.js` to match. Remove the debug log once correct.

- [ ] **Step 6: If `pollUntilDone` throws reading `data.data.status` or `data.data.response.data`**

Add a debug line right after `const data = await res.json();` inside the polling loop:

```js
const data = await res.json();
console.log('--- SUNO POLL RESPONSE ---', JSON.stringify(data));
const status = data.data.status;
```

Re-run, find the actual paths for `status` and the variations array (with `audio_url` / `duration` fields) in the logged JSON, and update the `const status = ...` and `const variations = ...` lines in `pipeline.js` to match. Remove the debug log once correct.

- [ ] **Step 7: Confirm the POC is proved**

Run the full pipeline again from a clean terminal:

Run: `SUNO_API_KEY=<your-suno-key> ANTHROPIC_API_KEY=<your-anthropic-key> node pipeline.js`

Expected final output: a `=== Results ===` section listing all 5 track titles, each with 2 variations showing `audio_url` and `Duration: <n>s`. No errors, no `undefined` values.

- [ ] **Step 8: Commit whatever fixes were needed**

```bash
git add pipeline.js lib/parseLyrics.js lib/parseLyrics.test.js
git commit -m "fix: correct pipeline.js field access and prompt to match live API responses"
```

(If no fixes were needed and the pipeline ran clean on the first try, skip this commit — there's nothing to commit.)

---

## Definition of done

- `npm install` succeeds and `@anthropic-ai/sdk` is in `package.json` dependencies
- `node --test lib/parseLyrics.test.js` passes
- `SUNO_API_KEY=... ANTHROPIC_API_KEY=... node pipeline.js` runs to completion and prints, for all 5 Rachel-brief tracks, two `audio_url` values each with no errors or `undefined` fields
- All changes are committed in small, logical commits
