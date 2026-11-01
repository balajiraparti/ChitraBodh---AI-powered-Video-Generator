# ChitraBodh local prototype

**Build 7: flexible duration and stronger script instructions.** The selected AI provider chooses the script, objects, positions, labels, connections and speech-triggered actions. New live plans require illustrations or explicit binary-search array operations; they cannot silently fall back to icon slides. Supported primitives include sun, moon, hills, water, trees, animals, people, soil, factories, atoms, boxes and arrows. The export is an animated MP4, not a clickable lesson.

Turn an educational topic into a vertical motion-graphics explainer. This is the local generation experiment described in the PRD, not the complete SaaS application.

## Try the visual demo

Requires Node 22+, Chrome or Edge, and FFmpeg/ffprobe on PATH. Dependencies are pinned in `package-lock.json`.

```powershell
npm ci
npm run doctor
npm run demo
npm run preview
```

Open http://127.0.0.1:4173. The demo exports a **75-second, 1080 × 1920, 30 fps MP4** about the water cycle. It is an authored example with synthetic timings and **no audio**, clearly labeled throughout. It demonstrates the renderer; it does not prove AI output quality or speech synchronization.

## Generate a real narrated video

Copy `.env.example` to `.env` if `.env` does not already exist. Enter these values locally, never in chat or version control:

- `AI_PROVIDER=gemini`: selects Gemini for script/storyboard requests. Set `nvidia` to explicitly switch back; there is no automatic cross-provider fallback.
- `GEMINI_API=interactions`: uses `/v1beta/interactions` with JSON-schema output. Set `generate_content` for the previous Gemini endpoint.
- `NVIDIA_API_KEY`: your NVIDIA API catalog key (server-side only).
- `NVIDIA_MODEL`: your model ID; configured as `nvidia/nemotron-3.5-super-vl-120b-a12b`.
- `GEMINI_API_KEY`: required only when `AI_PROVIDER=gemini`.
- `GEMINI_MODEL`: primary storyboard model, `gemini-3.8-flash`.
- `GEMINI_FALLBACK_MODELS`: comma-separated backups; defaults to `gemini-3.5-flash-lite`. Set an empty value to disable fallback. Both configured defaults have free-tier text input/output in Google's pricing as checked October 29, 2026; project quotas and availability still apply. Listing a model does not prove successful generation.
- `ELEVENLABS_API_KEY`: your ElevenLabs API key. The existing spelling `ELEVEN_LABS_API_KEY` is also supported.
- `ELEVENLABS_VOICE_ID`: an available voice you have auditioned for Indian-accented English. Accent/gender come from the selected voice; they are not automatic switches.
- `ELEVENLABS_MODEL_ID`: defaults to `eleven_multilingual_v2`.

```powershell
npm run generate -- --topic "How does the water cycle work?"
npm run preview
```

Optional: `--voice VOICE_ID` selects another voice; `--no-captions` disables burned-in captions. Credentials and free credits are provider-managed; live runs may consume paid credits. No paid call is made by `demo`, `doctor`, or tests.

The live path asks the selected AI provider for a structured script and visual plan, validates it, asks ElevenLabs for narration with character timing, then builds captions and animation cues from that timing. It exports and decodes the MP4 to check dimensions, duration and the presence of audio. The renderer executes validated vector scenes and timed array operations. Assets are local SVG primitives; this is not unrestricted image or physics generation. Geometry, references and speech cues are validated, but factual and visual quality still need review. Legacy saved plans and the offline water-cycle demo remain supported.

### Create from the portal

Run `npm run preview`, open http://127.0.0.1:4173, enter a topic, select a narrator and click **Generate video**. The page shows generation status and refreshes the gallery on success. Both requested voices are configured:

| Choice | ElevenLabs voice ID |
| --- | --- |
| Adam (default testing voice) | pNInz6obpgDQGcFmaJgB |
| Monika Sogam | C3aqZfd4M0h7Ys5tWGIS |

Adam has been verified with the current API key and replaces Viraj for testing. `.env` sets both `ELEVENLABS_MALE_VOICE_ID` and `ELEVENLABS_VOICE_ID` to Adam. The original Viraj (`bajNon13EdhNMndG3z05`) and Monika Sogam returned `402 payment_required`: their library-voice API access requires an eligible plan. Monika remains a selectable future option. Free-plan audio is for noncommercial testing; see [ElevenLabs usage terms](https://elevenlabs.io/docs/help-center/legal/can-i-publish-the-content-i-generate-on-the-platform) before commercial launch.

`node --import tsx src/check-providers.ts` checks model and voice metadata access. `node --import tsx src/check-speech.ts` makes one short speech request per voice and can consume credits when successful. Both keep keys out of output.

Scripts outside the accepted 40–90-second duration range are rewritten within a bounded budget. A run allows at most four storyboard-provider and three ElevenLabs requests; the four-attempt planning loop shares this budget with model fallback. Gemini 404, 429, 500/502/503/504 and request timeouts advance to the next configured model; failed models are skipped for the rest of the run. Authentication errors, malformed requests and cancellation stop without fallback. Invalid storyboards stay in the existing repair loop. ElevenLabs is never retried by the Gemini fallback. Ambiguous speech/text mismatches stop generation. Numbers and acronyms are requested as spoken words to reduce alignment mismatches.

## Temporary storage and limits

- One local generation runs at a time, enforced by an exclusive process lock.
- A run has a twenty-minute timeout. Failed runs are removed.
- Output, script, alignment and timing files are in `.local-runs/<run-id>/`.
- Successful runs expire two hours after completion. The preview server denies new requests immediately after expiry and deletes expired run directories on its next minute check.
- Cleanup also runs at generation/preview startup and with `npm run cleanup`.
- **When the computer or preview server is stopped, physical deletion cannot run.** Files are deleted at the next cleanup. An already-open stream or a downloaded copy cannot be recalled.
- The preview binds to localhost and is intended only for the trusted local machine. There is no authentication or multi-user hosting yet.

## Checks

```powershell
npm run typecheck
npm test
npm audit
```

Tests exercise scene validation, caption/cue timing, provider request contracts through real localhost HTTP, sanitized quota errors, request budgets, expired-media denial, and the generation lock. The HTTP stand-ins do not validate provider account permissions, model availability, actual audio, or live service behavior. Postman CLI was not usable in this environment, so these contract tests use Node's local HTTP server.

## What comes next

Implementation contracts: [API design](docs/ChitraBodh-API-Design.md), [OpenAPI JSON](docs/api/chitrabodh.openapi.json), and [database design](docs/ChitraBodh-Database-Design.md). Run `python scripts/validate-api-contract.py` for offline contract/example checks (requires Python `jsonschema`; no provider calls). These documents describe the planned application, not currently deployed endpoints.

The [dashboard system design](docs/ChitraBodh-Dashboard-System-Design.md) defines the next application build: authenticated dashboard, durable generation, MongoDB/R2, revisions, retention, and Instagram publishing. It distinguishes the working engine from planned application features.

First, add API credentials and review a real narrated export for pronunciation, factual accuracy, cue timing, visual usefulness, latency and cost. Test several topics before building the dashboard.

The following remain planned: Next.js application, team authentication, MongoDB, Cloudflare R2, background deployment, Instagram account connection, publish-now and scheduling within the two-hour retention window. There are no subscriptions, user analytics or brand customization in this prototype.

Design documents are in `docs/`. Implementation entry point: `src/cli.ts`; pipeline: `src/pipeline.ts`; renderer: `src/video/Explainer.tsx`.

Model references: [Google pricing](https://ai.google.dev/gemini-api/docs/pricing), [lifecycle](https://ai.google.dev/gemini-api/docs/deprecations), [project quotas](https://ai.google.dev/gemini-api/docs/rate-limits). Fallback cannot bypass shared project limits and does not enable billing.

### October 29 diagnostic update
Before the NVIDIA migration, the local `.env` preferred `gemini-3.5-flash-lite`, which passed a full illustrated-storyboard validation with the current key after one AI repair; `gemini-3.8-flash` remains fallback after its small-request test timed out. New jobs reread credential values from `.env`, taking precedence over stale process credentials. Voiceover keeps the original ElevenLabs key, then tries `ELEVEN_LABS_BACKUP_API_KEY` and `ELEVEN_LABS_BACKUP_API_KEY_NEW` only on `quota_exceeded`. All attempts share the three-request narration cap; subscription restrictions, authentication failures and generic rate limits do not rotate keys. Gemini HTTP 503 is reported as provider unavailability, separately from key rejection and quota errors. Numeric storyboard bounds are retained in the provider schema and still validated locally.

### Generation diagnostics and duration checks
New live plans must pass a 100–240-word preflight before voice synthesis; measured audio duration must be 40–90 seconds. Duration corrections retain the previous AI plan. Up to four planning attempts share the existing four-request storyboard budget (including fallbacks), and narration remains capped at three provider requests. `/api/generation` exposes a safe `stage` and `code` when a job fails, distinguishing storyboard validation, voice timing, provider errors and rendering. Full raw provider content is not returned to the browser.

### NVIDIA request contract
Uses `POST https://integrate.api.nvidia.com/v1/chat/completions`, bearer authentication, the configured model, system/user messages, `stream: false`, JSON-schema `response_format`, and a 16,384-token output cap. The configured Nemotron model uses `reasoning_effort: none`; only `choices[0].message.content` is parsed, never reasoning content. Output truncation is rejected. All existing scene, narration-length and timing checks remain active. Requests have a 120-second timeout. The four-request planning cap is shared across NVIDIA and Gemini counters. Switching providers requires restarting the local server; keys refresh for each new job.

Official contract: https://docs.api.nvidia.com/nim/reference/nvidia-nemotron-3_5-super-vl-120b-a12b-infer

### Gemini Interactions
Uses `input`, `response_format: {type: "text", mime_type: "application/json", schema}`, and `store: false` without background execution or provider conversation IDs. Repairs send the previous candidate explicitly. Only completed interactions with text in the final `model_output` step are parsed; thoughts and intermediate output are excluded. All local script, geometry, action and speech-cue validators still apply. This creates structured instructions for the existing vector renderer, not arbitrary generated image assets. ElevenLabs remains the narration provider. Verified on October 31 with the configured Gemini Flash-Lite model: four illustrated scenes passed validation after two script-length repairs. No narration was requested. Reference: https://ai.google.dev/gemini-api/docs/structured-output

The system instruction still targets 60–90 seconds, ideally 190–210 spoken words, using explanation, an example and a recap instead of filler. Shorter complete lessons are accepted from 40 seconds. This is consistent across preflight (100–240 words), measured audio (40–89.8 seconds to leave frame-rounding headroom), export validation (40–90 seconds), and dashboard text. Invalid motion and speech cues are still repaired or rejected. Word count is an estimate, never a substitute for measuring narration.
