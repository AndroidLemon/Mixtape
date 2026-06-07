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

## Pipeline script (implemented and verified end-to-end)

The draft that used to live in this section has been superseded by the real
thing: see `pipeline.js` at the repo root. It's been run against live
Anthropic + Suno credentials — all 5 Rachel-brief tracks generate lyrics,
submit to Suno, poll to completion, and print `audio_url`s with no errors.

Notable differences from the old draft (which was written against the wrong
Suno API — see "Suno API reference" below for the corrected facts):
- CommonJS (`require`/`module.exports`), not ESM `import` — this repo's
  `package.json` declares `"type": "commonjs"`
- Lyrics-block parsing lives in `lib/parseLyrics.js` (unit tested via
  `node --test lib/parseLyrics.test.js`), not inlined in `generateLyrics`
- `generateMusic`/`pollUntilDone` call `POST /v0/audio` and `GET /v0/audio/{id}`
  with the `{ title, lyrics, style }` / `{ id, status, audio_url, error }`
  shapes — not `customMode`/`taskId`/`variations`
- Model id is `claude-sonnet-4-6` (the old `claude-sonnet-4-20250514` is
  deprecated and 404s)

---

## Suno API reference (key facts — corrected)

The facts below replace an earlier version of this section that documented
`api.sunoapi.org` — a *different, incompatible* service. The real API for
this hackathon is a proxy at `api.suno.com`. Full reference:
`[Berklee Hackathon 2026] External API Quick Start.md` (repo root).

- Base URL: `https://api.suno.com/v0`
- Auth: `Authorization: Bearer <secret_key>` (keys look like `sk_live_` + 64 hex chars)
- Generate, custom mode (our use case — own lyrics + style): `POST /audio`
  with `{ title, lyrics, style }` → `{ id, status: "submitted", created_at }`
- Generate, simple mode (model writes lyrics + style from a description):
  `POST /audio` with `{ title, description }` — **mutually exclusive** with
  `style`/`lyrics`, the API rejects combining them
- Optional fields: `voice_id` (3 preset voices, custom cloning not yet open),
  `instrumental: true` (lyrics/description become optional)
- Cover: `POST /audio/{id}/covers`; Mashup: `POST /audio/{id}/mashups`
  (not used by this pipeline)
- Poll endpoint: `GET /audio/{id}` →
  `{ id, status, audio_url, error, metadata, created_at }`
- Status values: `submitted` → `queued` → `streaming` → `complete` (or `error`,
  see `error` field for the message). `audio_url` populates once status is
  `streaming` or `complete`
- **`audio_url` is not a stable pointer — it changes host and format as the
  job progresses**, observed live (and not documented in the spec doc, whose
  example response shows `cdn.suno.ai/.../audio.mp3`):
  - while `streaming`: `https://audiopipe.suno.ai/?item_id=<id>` (a live
    progressive-stream endpoint)
  - once `complete`: `https://cdn1.suno.ai/<id>.m4a` (a stable CDN file,
    `.m4a` — AAC in an MP4 container — *not* `.mp3` as the doc's example
    response shows)

  Anything that persists or caches `audio_url` (e.g. the gift page) must wait
  for `status === "complete"` before storing it — saving the streaming-phase
  URL would capture a transient endpoint, not the final file. And don't
  hardcode an `.mp3` assumption anywhere downstream (transcoding, MIME
  sniffing, `<audio>` `type` attributes) — the real files are `.m4a`.
- **One `audio_url` per generation request** — not multiple variations like
  the old (wrong) `sunoapi.org` docs claimed
- Typical wall-clock time to `complete` is "under a minute" per the docs; in
  practice our live run saw several minutes per track (5 concurrent), with
  no errors
- Rate limits: 10 req/s sustained, 20-request burst, per IP
- Account usage: `GET /v0/account/usage`

---

## Immediate task for Claude Code — DONE

~~Get the pipeline script running end to end against real API keys.~~

This has been completed and verified. `pipeline.js` runs end-to-end and
prints `audio_url`s for all 5 Rachel-brief tracks. See
`docs/superpowers/plans/2026-06-06-pipeline-poc.md` for the implementation
plan and its "Definition of done" checklist (all items satisfied).

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
