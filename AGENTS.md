# Agents.md — Mixtape

Onboarding notes for any agent picking up work on this repo. Read this first if you're taking over mid-task.

## What this project is

Mixtape turns a conversational intake session into a personalized AI-generated music gift: the user describes who the gift is for and what it should feel like, the app generates songs (lyrics via Claude, music via Suno), and delivers them as a hosted gift page with an audio player.

## Where the real spec lives

- **`MIXTAPE_CONTEXT.md`** — the canonical product spec. Contains the brief JSON schema, the three "shapes" (moment/journey/portrait), and the full intake chat system prompt. Read this before touching the intake chat or the brief schema.
- **`[Berklee Hackathon 2026] External API Quick Start.md`** — the *correct* Suno API reference (base URL, auth, request/response shapes, status values, rate limits). `MIXTAPE_CONTEXT.md` originally documented a different, incompatible service (`api.sunoapi.org`); its Suno section has since been corrected to match this doc and to match `pipeline.js`'s verified-working integration. If you're touching the Suno integration, this file is the source of truth — don't trust generic Suno docs found elsewhere.
- **`docs/superpowers/plans/`** — implementation plans for in-progress work. Check here for the active plan and its checkbox progress before starting something that might already be planned or underway. **Trust but verify the checkboxes** — a plan can finish without every box getting ticked (this happened once; see git history of `2026-06-06-pipeline-poc.md`). If a plan's status banner or surrounding docs say it's done, don't re-run it.

## Pipeline stages — contracts for handoffs

If you're splitting pipeline work across agents (one per stage) or wrapping a stage in something else (an Express endpoint, a queue worker), the function boundaries in `pipeline.js` are the integration surface. Each one is documented here as **owner / input / output / known failure modes** — read this before inferring the shape from the code, and update both the code and this table together if you change a contract.

- **Brief → Lyrics** — owner: `generateLyrics(brief)`
  - In: validated brief JSON (schema in `MIXTAPE_CONTEXT.md`)
  - Out: `[{ title, lyrics }]`, one per `brief.tracks[i]`, **same order** (matched positionally downstream, not by id/title)
  - Coupled to: the system prompt's `TRACK n: [title]` output format and `lib/parseLyrics.js`'s `parseLyricsResponse` — these are two halves of one contract. If you change how the prompt asks Claude to format output, update the parser regex and its tests in the same change (a Copilot review caught exactly this drift once: the prompt template read `TRACK [n]:` but the parser only matched `TRACK \d+:`)
  - Failure modes: throws on Anthropic API errors; a malformed/truncated response can silently yield fewer tracks than `brief.tracks` with no validation that the counts match
- **Lyrics → Music submitted** — owner: `generateMusic(brief, lyricTracks)`
  - In: brief + lyric tracks (matched positionally, see above)
  - Out: `[{ title, id }]`
  - Failure modes: throws per-track on non-2xx Suno responses or a missing `id` in the body (with status + response body in the error). Because requests run via `Promise.all`, **one track's failure rejects the whole batch** — there's no partial-success path
- **Music submitted → Complete** — owner: `pollUntilDone(tasks)`
  - In: `[{ title, id }]`
  - Out: `[{ title, id, audio_url }]`
  - Failure modes: throws on non-2xx poll responses (status + body in the error). **Tracks that report a Suno-side `error` are logged and silently dropped from the output array** — the caller has no way to distinguish "still running" from "failed and gone." Anything that needs to report per-track status (a status endpoint, a gift page showing partial results) must change this contract first — don't bolt status-reporting on top of an array that's already lost the failure information
  - `audio_url` is only a stable, persistable pointer once `status === 'complete'` (see the Suno API reference in `MIXTAPE_CONTEXT.md` for why — it changes host and format mid-stream)

## Conventions to follow

- **CommonJS, not ESM.** `package.json` declares `"type": "commonjs"` and `index.js` uses `require(...)`. Drafts in `MIXTAPE_CONTEXT.md` sometimes use `import` syntax — convert to `require` to match. Mixing module systems in one project causes `ERR_REQUIRE_ESM` headaches.
- **Tests run via Node's built-in runner**, already wired up as `npm test` → `node --test`. No external test framework (no Jest/Mocha/Vitest) — use `node:test` and `node:assert`.
- **Pure logic goes in `lib/`, gets unit tested.** Integration code that calls external APIs (Anthropic, Suno) is proven by running it live against real keys, not by mocking — this is a POC-stage project and the APIs' real response shapes are the actual unknowns worth flushing out.
- `index.js` exports the Express `app` and only calls `.listen()` when run directly (`require.main === module`) — keep that pattern if you extend the server, it lets tests `require()` the app without binding a port.

## How to run things

- `npm start` — runs the Express scaffold (currently just serves "Hello from Mixtape!" at `/`)
- `npm test` — runs all `*.test.js` files
- `node --check <file>` — syntax-check a file without running it
- Pipeline (built and verified end-to-end against live keys): `SUNO_API_KEY=<key> ANTHROPIC_API_KEY=<key> node pipeline.js`

## Working with multiple agents on this repo

- **The canonical docs are shared mutable state — change them together, in one commit.** `AGENTS.md`, `MIXTAPE_CONTEXT.md`, and the active plan in `docs/superpowers/plans/` describe the same facts from three angles (onboarding, spec, task checklist). When one of them turns out to be wrong — like the `api.sunoapi.org` dead end this project hit — update all three at once. PR #2 fixed the spec doc and this file but left the plan doc with the stale Suno facts; a Copilot review caught it, but the next agent to read the plan first would've gone down the wrong path in the meantime. If you only have time to fix one, fix `MIXTAPE_CONTEXT.md` (it's the canonical spec) and leave a note in the others pointing at it.
- **Resolve review threads by verifying the fix, not by replying to the comment.** Reproduce or reason through the failure mode the reviewer described, fix the root cause, run the relevant tests, *then* mark the thread resolved. Don't resolve first and fix after — and don't resolve a thread whose fix you haven't actually run.
- **Stage contracts (above) are the handoff between agents working on different parts of the pipeline.** If your task changes one (e.g. making `pollUntilDone` surface per-track failures instead of dropping them, so a status endpoint can report them), update the function *and* this doc's contract description in the same change — an agent picking up the next stage reads the contract, not the implementation, to know what to expect.

## What's deliberately deferred (don't build yet)

Per `MIXTAPE_CONTEXT.md`: visual design/animation, variation-selection UI, WAV conversion, the physical cassette artifact, auth/accounts/persistence, Suno Voice, stem separation, MIDI export, mashups.
