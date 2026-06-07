# Mixtape

Turns a conversational intake session into a personalized AI-generated music
gift: the user describes who the gift is for and what it should feel like,
the app generates songs (lyrics via Claude, music via Suno), and delivers
them as a hosted gift page with an audio player.

See `MIXTAPE_CONTEXT.md` for the full product spec (brief schema, intake
chat system prompt) and `AGENTS.md` for onboarding notes if you're picking
up development.

## Run the Express scaffold

```bash
npm install
npm start
```

Then open http://localhost:3000.

## Run the generation pipeline (POC)

`pipeline.js` runs the lyrics → music generation → polling flow end-to-end
against a hardcoded test brief, printing an `audio_url` per track. Verified
working against live Anthropic + Suno credentials.

```bash
SUNO_API_KEY=<key> ANTHROPIC_API_KEY=<key> node pipeline.js
```

Suno integration details (auth, endpoints, request/response shapes) live in
`[Berklee Hackathon 2026] External API Quick Start.md` — that's the source
of truth, not generic Suno docs found elsewhere.

## Tests

```bash
npm test
```

Runs all `*.test.js` files via Node's built-in test runner.
