# Agents.md — Mixtape

Onboarding notes for any agent picking up work on this repo. Read this first if you're taking over mid-task.

## What this project is

Mixtape turns a conversational intake session into a personalized AI-generated music gift: the user describes who the gift is for and what it should feel like, the app generates songs (lyrics via Claude, music via Suno), and delivers them as a hosted gift page with an audio player.

## Where the real spec lives

- **`MIXTAPE_CONTEXT.md`** — the canonical product spec. Contains the brief JSON schema, the three "shapes" (moment/journey/portrait), the full intake chat system prompt, a draft pipeline script, and Suno API reference notes (auth, endpoints, response shapes, status values). Read this before touching the intake chat, the brief schema, or the Suno integration.
- **`docs/superpowers/plans/`** — implementation plans for in-progress work. Check here for the active plan and its checkbox progress before starting something that might already be planned or underway.

## Conventions to follow

- **CommonJS, not ESM.** `package.json` declares `"type": "commonjs"` and `index.js` uses `require(...)`. Drafts in `MIXTAPE_CONTEXT.md` sometimes use `import` syntax — convert to `require` to match. Mixing module systems in one project causes `ERR_REQUIRE_ESM` headaches.
- **Tests run via Node's built-in runner**, already wired up as `npm test` → `node --test`. No external test framework (no Jest/Mocha/Vitest) — use `node:test` and `node:assert`.
- **Pure logic goes in `lib/`, gets unit tested.** Integration code that calls external APIs (Anthropic, Suno) is proven by running it live against real keys, not by mocking — this is a POC-stage project and the APIs' real response shapes are the actual unknowns worth flushing out.
- `index.js` exports the Express `app` and only calls `.listen()` when run directly (`require.main === module`) — keep that pattern if you extend the server, it lets tests `require()` the app without binding a port.

## How to run things

- `npm start` — runs the Express scaffold (currently just serves "Hello from Mixtape!" at `/`)
- `npm test` — runs all `*.test.js` files
- `node --check <file>` — syntax-check a file without running it
- Pipeline (once built per the plan): `SUNO_API_KEY=<key> ANTHROPIC_API_KEY=<key> node pipeline.js`

## What's deliberately deferred (don't build yet)

Per `MIXTAPE_CONTEXT.md`: visual design/animation, variation-selection UI, WAV conversion, the physical cassette artifact, auth/accounts/persistence, Suno Voice, stem separation, MIDI export, mashups.
