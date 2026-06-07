# Quickstart

A short guide to generating music through Suno's public API. Covers authentication, the four generation modes (Simple, Custom, Cover, Mashup), and how to attach one of our preset voices.

---

## Prerequisite

You need to have a Suno account that can use Google to login.

![][image1]

Contact Suno for access to the online portal [platform.suno.com](http://platform.suno.com). You need to provide the email address you used for Suno login. 

---

## Online Portal

Once an external API account is set up for you, you should be able to login [platform.suno.com](http://platform.suno.com) with your suno account email via Google OAuth. You should be able to view plans, current usage, and manage secret keys for API access. Create an API key and use it as a bearer token in your request’s `Authorization` header.

---

## Base URL

`https://api.suno.com/`  
---

## Authentication

Every request must include your API key in the `Authorization` header:

```
Authorization: Bearer <secret_key>
```

Keys should look like `sk_live_` followed by 64 hex characters. Treat them as secrets — do not check them into source control or expose them in client-side code. Rotate them through the Suno platform console. Key management will be available soon

---

## Generation Flow

All generation endpoints are asynchronous:

1. `POST` to the generation endpoint → returns `{ "id", "status": "submitted" }`  
2. Poll `GET /v0/audio/{id}` until `status` is `"complete"` (or `"error"`)  
3. When `status` is `"streaming"` or `"complete"`, `audio_url` is populated

Typical wall-clock time from submit to `complete` is under a minute.

### Status values

| Status | Meaning |
| :---- | :---- |
| `submitted` | Accepted; job has not started yet |
| `queued` | Waiting to start |
| `streaming` | Partial audio is available at `audio_url` (live progressive stream) |
| `complete` | Final CDN URL is available at `audio_url` |
| `error` | Failed; see `error` field |

---

## Preset Voice IDs

Custom voice cloning is not yet open to partners. You can pass any one of these three preset voice UUIDs in the optional `voice_id` field. Omitting `voice_id` lets the model pick a voice based on style and lyrics.

| `voice_id` | Description |
| :---- | :---- |
| `5b915c6d-8d96-416c-9755-eba65868cfef` | Preset voice A (female voice) |
| `c036ce3a-55e4-4690-9b8d-4516b37a96d5` | Preset voice B (weird kid voice) |
| `27f5465b-73c3-4134-b11e-70b0bd571c6c` | Preset voice C (low male voice) |

Any other value returns `400 Bad Request` with `{"error":"custom voice is not currently supported"}`.

---

## 1\. Simple mode — `POST /v0/audio` with `description`

Let the model generate both the lyrics and the style from a single natural-language prompt. Do **not** combine `description` with `style` — the API will reject it.

### 1a. Simple, no voice

```shell
curl -X POST https://api.suno.com/v0/audio \
  -H "Authorization: Bearer sk_live_<your-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "upbeat synthwave track about driving through Tokyo at night",
    "title": "Neon Drive"
  }'
```

### 1b. Simple, with preset voice

```shell
curl -X POST https://api.suno.com/v0/audio \
  -H "Authorization: Bearer sk_live_<your-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "upbeat synthwave track about driving through Tokyo at night",
    "title": "Neon Drive",
    "voice_id": "5b915c6d-8d96-416c-9755-eba65868cfef"
  }'
```

Response (both):

```json
{
  "id": "6e2b0f3a-1c5d-4a2e-9f81-7c11f9e24b08",
  "status": "submitted",
  "created_at": "2026-04-20T18:03:11Z"
}
```

---

## 2\. Custom mode — `POST /v0/audio` with `lyrics` \+ `style`

Supply your own lyrics and a style string. `title` is optional.

### 2a. Custom, no voice

```shell
curl -X POST https://api.suno.com/v0/audio \
  -H "Authorization: Bearer sk_live_<your-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "lyrics": "[Verse]\nWalking through the static glow\nEvery street a radio\n[Chorus]\nWe are the signal, we are the noise",
    "style": "dreampop, reverb-heavy guitars, melancholic",
    "title": "Signal & Noise"
  }'
```

### 2b. Custom, with preset voice

```shell
curl -X POST https://api.suno.com/v0/audio \
  -H "Authorization: Bearer sk_live_<your-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "lyrics": "[Verse]\nWalking through the static glow\nEvery street a radio\n[Chorus]\nWe are the signal, we are the noise",
    "style": "dreampop, reverb-heavy guitars, melancholic",
    "title": "Signal & Noise",
    "voice_id": "c036ce3a-55e4-4690-9b8d-4516b37a96d5"
  }'
```

### Instrumental (no vocals)

Set `instrumental: true`. Lyrics and description are then optional.

```shell
curl -X POST https://api.suno.com/v0/audio \
  -H "Authorization: Bearer sk_live_<your-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "style": "lo-fi hip hop, mellow piano, rainy night",
    "title": "Study Beats",
    "instrumental": true
  }'
```

---

## 3\. Cover mode — `POST /v0/audio/{id}/covers`

Re-generate an existing clip you own, optionally with new lyrics, new style, and/or a different voice. The `{id}` in the path is the `id` of a clip returned by a prior `POST /v0/audio` call.

The lyrics, style, and voice are all optional. Leave `lyrics` empty to produce an instrumental cover.

### 3a. Cover, no voice (new style only)

```shell
curl -X POST https://api.suno.com/v0/audio/6e2b0f3a-1c5d-4a2e-9f81-7c11f9e24b08/covers \
  -H "Authorization: Bearer sk_live_<your-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "style": "acoustic folk, fingerpicked guitar"
  }'
```

### 3b. Cover, with preset voice and new lyrics

```shell
curl -X POST https://api.suno.com/v0/audio/6e2b0f3a-1c5d-4a2e-9f81-7c11f9e24b08/covers \
  -H "Authorization: Bearer sk_live_<your-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "lyrics": "[Verse]\nNew words over the same melody\n[Chorus]\nSame song, different story",
    "style": "acoustic folk, fingerpicked guitar",
    "voice_id": "27f5465b-73c3-4134-b11e-70b0bd571c6c"
  }'
```

---

## 4\. Mashup mode — `POST /v0/audio/{id}/mashups`

Blend two clips you own into a new track. The `{id}` in the path is one parent (the "source"); pass the second parent in `additional_audio_id`. Voice conditioning (`voice_id`) is **not** supported on mashups.

`lyrics` and `style` are optional. Leave `lyrics` empty to produce an instrumental mashup. If you omit `title`, it defaults to `"<source title> x <additional title> (Mashup)"`.

```shell
curl -X POST https://api.suno.com/v0/audio/6e2b0f3a-1c5d-4a2e-9f81-7c11f9e24b08/mashups \
  -H "Authorization: Bearer sk_live_<your-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "additional_audio_id": "9a9e1da2-cf97-46bc-9b07-eaa2290fcba0",
    "lyrics": "[Verse]\nTwo songs braided into one\n[Chorus]\nNew shape, same heart",
    "style": "trap meets folk"
  }'
```

## ---

## 5\. Polling — `GET /v0/audio/{id}`

```shell
curl https://api.suno.com/v0/audio/6e2b0f3a-1c5d-4a2e-9f81-7c11f9e24b08 \
  -H "Authorization: Bearer sk_live_<your-key>"
```

Response while still generating:

```json
{
  "id": "6e2b0f3a-1c5d-4a2e-9f81-7c11f9e24b08",
  "status": "queued",
  "audio_url": "",
  "title": "Neon Drive",
  "created_at": "2026-04-20T18:03:11Z",
  "error": null,
  "metadata": {
    "lyrics": null,
    "style": null,
    "description": "upbeat synthwave track about driving through Tokyo at night"
  }
}
```

Response once complete:

```json
{
  "id": "6e2b0f3a-1c5d-4a2e-9f81-7c11f9e24b08",
  "status": "complete",
  "audio_url": "https://cdn.suno.ai/.../audio.mp3",
  "title": "Neon Drive",
  "created_at": "2026-04-20T18:03:11Z",
  "error": null,
  "metadata": {
    "lyrics": "[Verse]\n...",
    "style": "synthwave, driving, neon",
    "description": "upbeat synthwave track about driving through Tokyo at night"
  }
}
```

`voice_id`, `cover_audio_id`, and `mashup_clip_ids` are clip-type-scoped: each appears in `metadata` only when set. `voice_id` is populated when a preset voice was used. `cover_audio_id` appears on cover clips and points at the source clip. `mashup_clip_ids` appears on mashup clips and lists the two parent clip IDs.

---

## Errors

Errors use standard HTTP status codes with `{"error": "<message>"}` bodies.

| Status | Common causes |
| :---- | :---- |
| 400 | Missing both `lyrics` and `description`; using `style` with `description`; disallowed `voice_id`; missing `additional_audio_id` on a mashup |
| 401 | Missing or invalid `Authorization` header |
| 403 | Your plan does not include the requested feature (e.g. `generate.cover`, `generate.mashup`) |
| 404 | Source clip not found or not owned by your account (cover, mashup) |
| 429 | Rate limit (10 req/s sustained, 20 burst) or plan quota exceeded |
| 500 | Server error — safe to retry after a short backoff |

---

## Limits & quotas

- **Request rate**: 10 requests/second sustained, 20-request burst, applied per IP.

---

## Account usage — `GET /v0/account/usage`

```shell
curl https://api.suno.com/v0/account/usage \
  -H "Authorization: Bearer sk_live_<your-key>"
```

Returns counters for each feature the plan gates, with the window they apply over.

[image1]: docs/assets/external-api-quick-start-account-usage.png