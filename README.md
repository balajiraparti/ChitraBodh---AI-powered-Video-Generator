# ChitraBodh local prototype

**Build 2: motion-first explainers.** Water-cycle topics can now use a continuous animated landscape with water ripples, sunlight, vapor movement, cloud droplets, rainfall and runoff, triggered by narrated phrases. Other topics retain animated diagram flows. See [updated core features](docs/ChitraBodh-V1-Motion-Update.md). These are procedural vector animations; the export remains a normal MP4, not a clickable lesson.

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

- `GEMINI_API_KEY`: a key with access to your configured Gemini model.
- `GEMINI_MODEL`: configurable; the default is `gemini-2.5-flash`, verified with a real scene-plan request.
- `ELEVENLABS_API_KEY`: your ElevenLabs API key. The existing spelling `ELEVEN_LABS_API_KEY` is also supported.
- `ELEVENLABS_VOICE_ID`: an available voice you have auditioned for Indian-accented English. Accent/gender come from the selected voice; they are not automatic switches.
- `ELEVENLABS_MODEL_ID`: defaults to `eleven_multilingual_v2`.

```powershell
npm run generate -- --topic "How does the water cycle work?"
npm run preview
```

Optional: `--voice VOICE_ID` selects another voice; `--no-captions` disables burned-in captions. Credentials and free credits are provider-managed; live runs may consume paid credits. No paid call is made by `demo`, `doctor`, or tests.

The live path asks Gemini for a structured script and visual plan, validates it, asks ElevenLabs for narration with character timing, then builds captions and animation cues from that timing. It exports and decodes the MP4 to check dimensions, duration and the presence of audio. The renderer uses three layouts: icon/text, connected process diagrams, and comparison. All icons are local SVGs.

### Create from the portal

Run `npm run preview`, open http://127.0.0.1:4173, enter a topic, select a narrator and click **Generate video**. The page shows generation status and refreshes the gallery on success. Both requested voices are configured:

| Choice | ElevenLabs voice ID |
| --- | --- |
| Adam (default testing voice) | pNInz6obpgDQGcFmaJgB |
| Monika Sogam | C3aqZfd4M0h7Ys5tWGIS |

Adam has been verified with the current API key and replaces Viraj for testing. `.env` sets both `ELEVENLABS_MALE_VOICE_ID` and `ELEVENLABS_VOICE_ID` to Adam. The original Viraj (`bajNon13EdhNMndG3z05`) and Monika Sogam returned `402 payment_required`: their library-voice API access requires an eligible plan. Monika remains a selectable future option. Free-plan audio is for noncommercial testing; see [ElevenLabs usage terms](https://elevenlabs.io/docs/help-center/legal/can-i-publish-the-content-i-generate-on-the-platform) before commercial launch.

`node --import tsx src/check-providers.ts` checks model and voice metadata access. `node --import tsx src/check-speech.ts` makes one short speech request per voice and can consume credits when successful. Both keep keys out of output.

Scripts outside the 60–90-second duration target are rewritten within a bounded budget. A run allows at most four Gemini and three ElevenLabs requests; the current loop makes at most three of each. Transport and quota failures stop rather than retrying a potentially billable request. Ambiguous speech/text mismatches stop generation. Numbers and acronyms are requested as spoken words to reduce alignment mismatches.

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

First, add API credentials and review a real narrated export for pronunciation, factual accuracy, cue timing, visual usefulness, latency and cost. Test several topics before building the dashboard.

The following remain planned: Next.js application, team authentication, MongoDB, Cloudflare R2, background deployment, Instagram account connection, publish-now and scheduling within the two-hour retention window. There are no subscriptions, user analytics or brand customization in this prototype.

Design documents are in `docs/`. Implementation entry point: `src/cli.ts`; pipeline: `src/pipeline.ts`; renderer: `src/video/Explainer.tsx`.
