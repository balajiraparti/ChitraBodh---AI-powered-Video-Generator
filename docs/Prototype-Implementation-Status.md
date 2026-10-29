# Local prototype implementation status

## Build 2 — explanatory motion (28 October 2026)

User review changed the next-build priority from dashboard expansion to animated explanations. The water-cycle template now shows a persistent landscape, rippling lake, animated sun and heat indicators, schematic rising vapor, developing cloud droplets, rainfall, river flow and infiltration. Gemini chooses the phase and a spoken trigger phrase; the timing layer maps it to actual ElevenLabs alignment. Generic diagrams also have directed moving flow and animated semantic icons.

The updated sample used three planning requests and one narration request with Adam. A visual-only revision reused that audio and timing without provider calls and preserves the original expiry. Nine tests and TypeScript checking passed, including phase activation and exact trigger validation. Rain and water crops from two times within the same scene produced different frame checksums; sample frames were also visually inspected. This is an animated educational illustration, not a physical simulation. Factual and perceived-synchronization review still require a person.

See [revised core features and acceptance criteria](ChitraBodh-V1-Motion-Update.md). Dashboard and Instagram work remain deferred. The Next.js installation was cancelled when the user changed priorities; no Next.js dependency was added.

## First narrated export — Adam

Adam (`pNInz6obpgDQGcFmaJgB`) is now the default male testing voice in `.env`, `.env.example` and the portal. The water-cycle example completed with one Gemini request and one ElevenLabs request. Its MP4 is 70.933 seconds, 1080 × 1920, H.264 video with AAC audio. The complete file passed FFmpeg decoding. Speech alignment produced six scenes and 38 caption segments, with all cue starts within their scene boundaries. Sample frames were inspected. TypeScript checking and all eight tests passed.

The completed video is served in the local portal and expires two hours after completion. This verifies the real generation/export path; it does not replace human review of factual accuracy, pronunciation or perceived synchronization. Monika Sogam remains a library voice requiring an eligible ElevenLabs plan.

## Voice integration update

Both supplied ElevenLabs IDs are now selectable in the local creator portal. The portal accepts an idea, voice selection and caption preference, starts generation, and reports progress or failure. It restricts requests to the local origin with a per-process token, validates the voice allowlist, and prevents duplicate portal jobs. Eight tests and TypeScript checking pass.

The existing `.env` spelling `ELEVEN_LABS_API_KEY` is supported without rewriting the user's secrets. Gemini 2.5 Flash generated a valid scene plan after simplifying the provider-side JSON schema; full local validation remains enabled. It replaces the earlier default model, which returned 503 in the live test.

Both voices returned HTTP 402, `payment_required`, on speech requests: the current free ElevenLabs plan cannot use library voices through the API. Voice metadata reads returned `missing_permissions`. No complete narrated video was produced. An eligible plan or API-accessible replacement voice is needed. The portal labels them Voice 1 and Voice 2 rather than inferring names or gender.

The updated page was checked over HTTP. Browser automation could not start because its local kernel assets were unavailable; visual browser QA for this update remains unverified. Earlier implementation notes below describe the initial demo milestone.

Implemented 27 October 2026.

## Available

- A command-line topic-to-video pipeline, with a configurable Gemini model and ElevenLabs voice.
- Schema-constrained scene plans plus checks for valid node references and exact spoken cue phrases.
- ElevenLabs timestamp-response handling, captions and cue timing derived from character alignment.
- Three fixed visual layouts, a local SVG icon library, vertical H.264 export and media validation.
- A clearly labeled, silent water-cycle demo using authored content and synthetic timing.
- A localhost preview/download page, one-generation process lock, request budgets and temporary output cleanup.

## Verification and limits

TypeScript checking and seven automated tests pass. Tests cover plan and timing errors, actual HTTP requests to local provider stand-ins, quota-error sanitization, a hanging provider timeout, request budgets, the generation lock and expiry deletion. Tests use a separate temporary directory from real outputs.

The authored water-cycle demo was rendered and verified as a 75.000-second, 1080 × 1920, 30 fps H.264 MP4. FFmpeg decoded the entire output successfully. Frames at ten, twenty-five and forty seconds were visually inspected for the icon, diagram and comparison layouts. This file is temporary and subject to the two-hour retention policy.

Npm audit reports zero vulnerabilities after overriding transitive Zod versions with the patched direct dependency. The dependency versions and override are recorded in package.json and package-lock.json.

The local machine has Chrome, FFmpeg and ffprobe. The live command correctly stops when credentials are absent. No real Gemini or ElevenLabs requests were made. Voice quality, real speech synchronization, model access, paid cost and real-generation success rates remain unverified.

Postman API Simulation instructions were consulted, but the installed Postman command did not return a usable CLI version. The provider checks therefore use a native Node HTTP test server rather than Postman simulations.

## Next acceptance milestone

Configure the provider credentials locally and audition one Indian-accented English voice. Generate the same water-cycle example with real narration, then try at least two different topics. Review educational accuracy, pronunciation, caption legibility and whether visual changes match the spoken explanation. Record elapsed time and provider usage before deciding to build the dashboard.

## Intentionally deferred

Team sign-in, dashboard idea submission, AI idea brainstorming, dashboard voice selection, MongoDB, R2, deployed workers and Instagram publishing/scheduling are not implemented. They remain in the product plan. The two-hour local deletion policy requires the preview process to remain running; after downtime, cleanup resumes on startup.
