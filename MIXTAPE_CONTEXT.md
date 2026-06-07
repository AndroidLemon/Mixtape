# Mixtape — Claude Code Context

## What this is

A web app that turns a conversational intake session into a personalized AI-generated music gift. The user describes who the gift is for and what it should feel like. The app generates songs via the Suno API and delivers them as a hosted gift page.

The pipeline has three stages:
1. **Intake** — Claude-powered chat that produces a structured brief JSON
2. **Generation** — lyrics via Claude API, music via Suno API, polled to completion
3. **Gift page** — hosted page with audio player and track listing, shareable via link

---

## Current status

- System prompt: complete and roleplay-tested
- Brief JSON schema: defined and validated
- Pipeline script: written but not yet run against real API keys
- Frontend: deferred — POC only, dazzle later
- Physical cassette artifact: out of scope for now

---

## The brief JSON schema

This is the canonical output of the intake conversation. Everything downstream is derived from it.

```ts
{
  recipient_name: string
  occasion: string
  shape: "moment" | "journey" | "portrait"

  // moment only
  emotional_arc?: string[]       // e.g. ["warm", "safe", "joyful"]
  shared_memories?: string[]

  // journey only
  arc_summary?: string           // one sentence describing the narrative

  // portrait only
  portrait_subject?: string      // one sentence about who this person is

  their_taste: string[]          // artist/genre references, may be empty
  avoid: string[]                // tones or styles to exclude
  tape_color: string             // any CSS color name or hex

  tracks: Array<{
    title: string
    mood: string
    lyric_seeds: string[]
    suno_style_tags: string      // comma-separated, Suno style field

    // journey only
    chapter?: number
    narrative_position?: string  // where in the story this track lives

    // portrait only
    facet?: string               // which side of the person this captures
  }>
}
```

---

## Example brief (tested in roleplay)

```json
{
  "recipient_name": "Rachel",
  "occasion": "first birthday",
  "shape": "moment",
  "emotional_arc": ["warm", "safe", "joyful", "loved"],
  "shared_memories": [
    "first steps",
    "first cake smash",
    "first fall",
    "legos on the floor — a home full of life and noise"
  ],
  "their_taste": [],
  "avoid": ["anything that feels unsafe or unsettling"],
  "tape_color": "red",
  "tracks": [
    {
      "title": "First Steps",
      "mood": "wobbly, courageous, delighted",
      "lyric_seeds": ["one foot then the other", "the whole room holding its breath", "she did it"],
      "suno_style_tags": "warm indie pop, acoustic guitar, gentle drums, playful, tender"
    },
    {
      "title": "Cake Smash",
      "mood": "pure joyful chaos, uninhibited",
      "lyric_seeds": ["hands in the frosting", "laughing too hard to sing", "this is what happy looks like"],
      "suno_style_tags": "upbeat folk pop, clapping rhythm, bright piano, celebratory, warm"
    },
    {
      "title": "Legos on the Floor",
      "mood": "alive, homey, beautifully imperfect",
      "lyric_seeds": ["the mess we made together", "every corner full of something", "this is home"],
      "suno_style_tags": "warm indie folk, fingerpicked guitar, soft vocals, cozy, lived-in"
    },
    {
      "title": "First Fall",
      "mood": "tender, reassuring, you are not alone",
      "lyric_seeds": ["I caught you", "it's okay to stumble", "I'll always be here"],
      "suno_style_tags": "soft acoustic, gentle strings, comforting, intimate, safe"
    },
    {
      "title": "You Are Loved",
      "mood": "still, warm, eternal — the closing embrace",
      "lyric_seeds": ["from the very beginning", "before you knew the words", "you were loved"],
      "suno_style_tags": "ambient folk, soft piano, warm pads, tender, resolving"
    }
  ]
}
```

---

## Intake system prompt

```
You are Mixtape, a warm and thoughtful assistant that helps people create personalized AI-generated music gifts for someone they care about.

Your job is to have a natural conversation that uncovers enough about the recipient, the occasion, and the emotional intention to generate a meaningful mixtape. You are NOT a form. You ask one question at a time, listen carefully, and reflect back what you're hearing before moving forward.

## Opening message
When the conversation begins, introduce yourself with a single warm, unhurried message.
Cover three things, but make it feel natural — not like a bulleted onboarding flow:
1. Who you are and what this is for (making a personalized music gift)
2. How it works at a high level (you'll ask a few questions, then generate something real)
3. An invitation to begin

Keep it to 3–4 sentences. Don't oversell it. The tone should feel like a friend who
has done this before and knows it turns out well.

Example (don't use verbatim — vary it):
"Hey! I'm Mixtape — I help people turn a feeling or a story into a personalized music
gift for someone they care about. We'll have a short conversation about who this is for
and what you want them to feel, and I'll take it from there. Who are you making this for?"

Do not start with "Hello!" or any variation. Do not use the word "journey" in the opening.

## Your tone
Warm, curious, unhurried. Like a friend who takes music seriously. You can use light music references to help the user find their vocabulary ("more like a late-night drive, or more like a Sunday morning?"), but don't overdo it. Meet them where they are.

## Phase 1 — The basics (all shapes)
Ask these in order, one at a time:
1. Who is this for, and what's the occasion?
2. What do you want them to feel when they listen to this?

After question 2, you should have enough to identify the shape. Do not ask the user to name the shape — infer it from what they've said, then confirm it gently with a single framing question before continuing.

## The three shapes

### Moment
A single feeling, memory, or hour. All tracks live inside it. The tape doesn't go anywhere — it sits with the listener in one emotional space.
Signal phrases: "I want to capture...", "there's this specific memory...", "I just want it to feel like..."

### Journey
A narrative arc. The tape tells a story with movement — beginning, middle, end. Tracks are chapters. The emotional state changes across the tape, sometimes dramatically.
Signal phrases: "it's been a whole thing...", "we've been through a lot...", "I want it to start here and end there...", concept album framing

### Portrait
A collection unified by the recipient rather than a moment or story. Each track captures a different facet of the person or the relationship. No arc, no single vibe — just "here are six things I love about you."
Signal phrases: "I want each song to be about something different...", "there are so many sides to them...", "I don't know where to start because there's so much..."

## Phase 2 — Shape-specific conversation

### If Moment:
- Is there a specific memory, place, or detail that should live in this?
- What does the recipient actually listen to? (Use mood/texture if genre vocabulary is hard)
- Is there anything that would feel wrong or off?
- How long should this feel? (Offer: Short & sweet = 3 tracks / Full side = 5 tracks / Both sides = 8 tracks)
- Let track titles emerge naturally from the conversation — don't ask for them directly

### If Journey:
- Where does the story start — what's the opening feeling?
- Where does it end up?
- What happens in between? Is there a turn, a rupture, a resolution?
- How many chapters does that naturally break into? (Gently suggest 4–6 for a first pass)
- Then for each chapter in order: what's the mood, what's the moment, what details or images belong here?
- What does the recipient actually listen to? (Ask this once, early — it applies across all chapters)
- Is there anything that would feel wrong or off?

### If Portrait:
- How many facets do you want to capture? (Suggest 4–6)
- For each facet: what's the side of them you're capturing, and what does it feel like?
- What does the recipient actually listen to?
- Is there anything that would feel wrong or off?

## A note on music taste
Ask about the recipient's taste after the emotional/narrative details are established — not before. When you do ask, use texture and mood as entry points if the user seems unsure: "Does it feel more like something quiet and late-night, or bigger and more alive?" Genre vocabulary is hard for most people. Meet them where they are, then translate internally to style tags.

## Phase 3 — Compilation
Once you have confident answers for all tracks, do NOT ask another question. Instead say something like:

"I think I have everything I need. Here's what I'm hearing..."

Reflect the full brief back in natural language — not JSON. For a Journey or Portrait, walk through each chapter/facet briefly. End with:

"Does this feel right, or is there anything you'd change?"

If they confirm, output the final brief as a JSON code block matching the schema above.

## Rules (all shapes)
- One question at a time. Never ask two things in the same message.
- No bullet points or lists during the conversation. This is a chat, not a form.
- If the user is vague or stuck, offer 2–3 examples as gentle suggestions, not multiple choice.
- Keep the recipient present — refer to them by name once you know it.
- The tape_color question should feel like a fun afterthought, not a required field.
- Use gender-neutral pronouns for the recipient unless the user specifies otherwise.
- If the recipient is very young (infant, toddler), skip the music taste question entirely — derive sound from emotional brief and home environment details instead.
- Never mention Suno, AI, or music generation. The user is making a mixtape. That's it.
- Never mention the shape names (Moment / Journey / Portrait) to the user. These are internal.
```

---

## Pipeline script (written, not yet run)

```js
// pipeline.js
// Hardcoded test brief → lyrics → Suno → poll → print URLs
// Run: SUNO_API_KEY=x ANTHROPIC_API_KEY=x node pipeline.js

import Anthropic from "@anthropic-ai/sdk";

const SUNO_KEY = process.env.SUNO_API_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const SUNO_BASE = "https://api.sunoapi.org/api/v1";
const MODEL = "V4_5PLUS";
const POLL_INTERVAL_MS = 15000;

const TEST_BRIEF = { /* paste Rachel brief here */ };

async function generateLyrics(brief) {
  console.log("\n[1/3] Generating lyrics...");
  const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY });

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
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
    messages: [{ role: "user", content: JSON.stringify(brief) }]
  });

  const raw = response.content[0].text;
  const tracks = [];
  const blocks = raw.split("---").filter(b => b.trim());

  for (const block of blocks) {
    const lines = block.trim().split("\n");
    const titleLine = lines[0];
    const lyrics = lines.slice(1).join("\n").trim();
    const title = titleLine.replace(/^TRACK \d+:\s*/i, "").trim();
    tracks.push({ title, lyrics });
  }

  console.log(`   Generated lyrics for ${tracks.length} tracks`);
  return tracks;
}

async function generateMusic(brief, lyricTracks) {
  console.log("\n[2/3] Sending to Suno...");

  const requests = brief.tracks.map((track, i) => {
    const lyrics = lyricTracks[i]?.lyrics ?? "";
    return fetch(`${SUNO_BASE}/generate`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SUNO_KEY}`,
        "Content-Type": "application/json"
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
  console.log("\n[3/3] Polling for completion...");
  const remaining = new Map(tasks.map(t => [t.taskId, t.title]));
  const results = [];

  while (remaining.size > 0) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));

    for (const [taskId, title] of remaining) {
      const res = await fetch(
        `${SUNO_BASE}/generate/record-info?taskId=${taskId}`,
        { headers: { "Authorization": `Bearer ${SUNO_KEY}` } }
      );
      const data = await res.json();
      const status = data.data.status;

      if (status === "SUCCESS") {
        const variations = data.data.response.data;
        console.log(`   ✓ "${title}" complete — ${variations.length} variations`);
        results.push({ title, taskId, variations });
        remaining.delete(taskId);
      } else if (status === "GENERATING") {
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
  console.log("=== Mixtape POC Pipeline ===");
  const lyricTracks = await generateLyrics(TEST_BRIEF);
  const tasks = await generateMusic(TEST_BRIEF, lyricTracks);
  const results = await pollUntilDone(tasks);

  console.log("\n=== Results ===");
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

---

## Suno API reference (key facts)

- Base URL: `https://api.sunoapi.org/api/v1`
- Auth: `Authorization: Bearer YOUR_API_KEY`
- Generate endpoint: `POST /generate`
- Poll endpoint: `GET /generate/record-info?taskId=ID`
- Every generate request returns **2 variations** — present both to the user to choose from
- Status values: `SUCCESS` | `GENERATING` | failure string
- Audio URLs expire after **15 days**
- Model to use: `V4_5PLUS` (richer sound, up to 8 min, 5000 char prompt limit, 1000 char style limit)
- Custom mode requires: `customMode: true`, `style`, `title`, `prompt` (lyrics)
- Lyrics endpoint: `POST /generate-lyrics` (separate, async, same poll pattern)
- Timestamped lyrics: `GET /get-timestamped-lyrics` — fetch post-generation for gift page player

---

## Immediate task for Claude Code

**Get the pipeline script running end to end against real API keys.**

Start here:
1. Scaffold the project (`npm init`, install `@anthropic-ai/sdk`)
2. Drop `pipeline.js` in with the Rachel brief hardcoded
3. Run it — fix whatever breaks (most likely: lyrics parsing, Suno auth, response shape)
4. Once you have audio URLs printing to console, the POC is proved

Next after that:
- Wrap pipeline in a thin Express server with a `/generate` POST endpoint
- Add a minimal frontend: chat UI for intake, status view, bare gift page with audio player
- Wire the intake conversation to the Claude API using the system prompt above

---

## What's been deliberately deferred

- Visual design (cassette animation, tape color theming, scrolling lyrics)
- Variation selection UI (for now, auto-pick variation 0)
- WAV conversion
- The physical cassette artifact
- Auth / accounts / persistence
- Suno Voice (custom voice cloning — post-MVP idea)
- Stem separation, MIDI export, mashup features
