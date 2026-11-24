# ChitraBodh — F19 AI storyboard review and editing

Date: 24 November 2026. Status: documentation complete; design and implementation planned, not shipped.

This specification extends the [PRD](ChitraBodh-V1-PRD.md), [system design](ChitraBodh-Dashboard-System-Design.md), [API design](ChitraBodh-API-Design.md), and [database design](ChitraBodh-Database-Design.md). It supersedes their automatic-only creation flow for the future F19 path. Existing endpoints keep their current behavior until an explicit rollout. [PROJECT_STATUS](../PROJECT_STATUS.md) records implementation truth.

## 1. Product decision and boundaries

Creators review the lesson before paying for speech and rendering. AI remains responsible for producing a complete valid visual plan. The creator supplies an idea, reviews scenes, optionally edits narration or requests changes in ordinary language, then explicitly generates the video. No code, JSON, object coordinates, model configuration, or animation programming appears in the creator interface.

Four steps: **Idea → Review storyboard → Generate video → Watch and share**. Review does not require editing or approving every scene separately. One Generate video action confirms the current complete plan. Instagram publishing remains a separate confirmation after a video becomes ready.

In scope: ordered scene cards, representative visual frames, silent motion preview, narration text, estimated scene timing, whole-storyboard or scene-scoped AI feedback, direct narration edits, candidate comparison, apply/discard, reload recovery and generation from the selected plan. Out of scope: free-form canvas, timeline keyframes, code editor, real-time collaborative editing, arbitrary uploaded assets, generated preview voiceover, subscriptions, custom brands and automatic publication. AI can propose scene insertion/removal/reordering through whole-board feedback; manual drag/drop is not required initially.

Default design decisions for review: one outstanding storyboard AI operation per creator; up to three retained saved storyboard revisions per project; two-hour retention for plan content and derived previews. Topic drafts remain under the existing F04 policy. These are new F19 defaults, not evidence of implementation.

## 2. Creator experience

1. Open Create or a saved topic. Keep topic, narrator and caption controls and existing brainstorming. Choose **Preview storyboard**. Existing direct-generation behavior remains available only behind the legacy rollout flag, not a confusing second primary CTA.
2. Show cancellable planning progress. Returning to the page restores the operation. Once ready, show ordered, numbered scenes with title, visual preview, narration and estimated duration. Show the total estimate with “Timing is estimated; final narration may vary.” The preview is silent and is not the final MP4.
3. Select a scene. See key frames (start, key action, end) and Play motion preview / scrub controls. Describe visuals in plain language and provide an accessible textual explanation. Use the real approved scene components, not stock illustrations that promise unsupported output.
4. Enter feedback such as “Show evaporation rising from the lake” or “Highlight the checked array element before moving to the next box.” Scope is visibly **This scene** or **Whole video**. Preview the candidate alongside the saved narration and a readable change summary. **Apply changes** commits it; **Discard** preserves the previous plan. The AI must not claim changes that are absent from the resulting candidate.
5. Direct narration edits are submitted as a candidate too: validate cue references and repair affected visual timing anchors with AI if needed. Show all resulting changes before Apply. Never save a narration edit with dangling speech-trigger references.
6. Generate video confirms the current revision, narrator and caption choice. Disable while unsaved edits or a candidate are unresolved. Explain the reason beside the action. After acceptance, open existing F07 progress. Preserve an editable storyboard copy for later work, but never change the snapshot already queued.

Input limits: topic 2,000 Unicode characters (existing behavior); feedback 1–1,000 Unicode code points after trimming; per-scene narration at most 2,000 code points and whole-board text at most 12,000. Show counters and explicit validation, including at 1,001 feedback characters. Proposed scene range is 3–12, subject to reconciling the production plan schema before coding; the UI and server must share the same final bound. Target 60–90 seconds; 40–90 seconds accepted. Out-of-range estimates require adjustment before submission; actual voice duration is checked later.

## 3. Architecture and data flow

Browser → authenticated Next.js API → MongoDB storyboard command queue → bounded Node planning worker → Gemini adapter → existing plan schema, semantic and renderability validators → immutable candidate → client preview using the shared Remotion scene renderer. NVIDIA stays a manually configured backup, not an automatic fallback.

A dedicated planning worker shares provider budget enforcement with brainstorming and generation planning. It does not occupy the serial full-video renderer slot. Use heartbeat leases and monotonically increasing fencing tokens; a superseded worker cannot commit a candidate. Recovery resumes a known command or marks it failed without inserting another command with the same key. No in-memory-only queue and no long-running HTTP request tied to a browser session.

Preview uses estimated narration timings and the same allowlisted scene engines (illustrations, arrays, diagrams). Final rendering uses ElevenLabs alignment. Layout, objects, labels, scene order and semantic action sequence must match; exact timestamps may differ. No TTS or full MP4 rendering is triggered by planning or edits. Prefer browser-side rendering of validated structured data; optional thumbnail caches are private Filebase objects with signed-in access and explicit expiry, never public bucket URLs.

Generate → transaction verifies ownership, current revision/hash, renderer/schema compatibility, expiry, candidate resolution, current voice eligibility and existing one-active-generation rule → copies the exact approved plan/settings into a job-owned immutable snapshot → creates normal version and queued job → worker skips fresh storyboarding → narration → alignment → animation → upload → Ready.

Hash a canonical representation of the full plan, schema version and chosen render settings. Persist the hash on approval and job; compare before execution. Text or visual edits invalidate approval. Caption/narrator changes require a fresh confirmation; changing narrator also recalculates estimates. Runtime fitting may adjust timing within supported bounds, but must not rewrite words, delete scenes or change visual meaning without returning to review. If measured duration cannot meet 40–90 seconds, fail with an actionable “Adjust storyboard length” recovery; retain the plan and disclose that narration credits may already have been used.

## 4. State and consistency rules

Storyboard head: `planning → editable`; planning failure → `failed`; cancellation → `cancelled`. An editable head remains readable during editing. Only applying a validated candidate advances its revision. Expiry/deletion overrides all content reads. Approval is immutable job input, not a mutable board status.

Operation: `queued → running → succeeded | failed | cancelled`; expired lease permits fenced recovery. Candidate: `pending → applied | discarded | expired`. Only one pending candidate and one nonterminal operation per board. Concurrent tabs use expectedRevision; stale edits return 409 and preserve client text for comparison. A candidate produced against an old revision cannot be applied. Scene IDs remain stable for unchanged scenes; inserted scenes get new IDs and deleted IDs cannot be targeted.

AI edits scoped to one scene must preserve other scenes byte-for-byte, except explicit cross-scene consistency corrections shown for whole-board confirmation. Cross-scene algorithm state and educational correctness are validated after every edit. Unsupported requests return understandable feedback rather than raw validator traces. Invalid responses receive at most one bounded repair attempt within the original operation budget; failure leaves the saved plan untouched.

Server checks origin/CSRF and session on mutations, owner scope on every record, and payload/array complexity before inference. Missing/foreign records return 404, signed-out requests 401, expired accessible records 410, stale/active conflicts 409, invalid input 422, limits 429 with Retry-After, temporary provider outage 503. Content is untrusted data: no eval, generated JavaScript, arbitrary URL fetches or executable SVG. Use existing verified/admin-approved AI eligibility plus owner, IP and global provider budgets. Reserve budget atomically before provider calls; retries count toward it. Log IDs, stage, latency and safe failure codes, not credentials or full scripts/prompts.

## 5. Proposed API contract (not implemented)

All paths use `/api/v1`; command POSTs require UUID Idempotency-Key. Same key and same canonical request replays the receipt, different payload returns 409. Receipts remain recoverable after lease expiry. Standard responses use `{data: ...}` and errors `{error: {code, message, retryable, requestId}}`; reconcile with the repository's existing envelope before implementation rather than changing unrelated endpoints.

| Method and path | Request | Success and checks |
|---|---|---|
| POST /projects/{projectId}/storyboards | `{expectedProjectRevision}` | 202 `{storyboardId, operationId, status:"queued"}`; snapshot saved topic/settings; validate AI eligibility and no conflicting operation |
| GET /storyboards/{id} | None | 200 `{id, projectId, revision, planHash, state, expiresAt, scenes, estimatedDurationSeconds, settings, pendingCandidateId}`; safe structured render data, no provider secrets |
| POST /storyboards/{id}/edits | `{expectedRevision, scope:"scene"|"storyboard", sceneId?, feedback? , narration?}` | 202 operation receipt; exactly one of feedback/narration; narration requires scene scope; reject unknown scene and out-of-bound content |
| GET /storyboard-operations/{id} | None | 200 `{id, status, stage, candidateId?, error?, retryAfterMs}`; poll with backoff, stop on terminal status |
| POST /storyboard-operations/{id}/cancel | `{}` | 200 terminal/accepted cancellation state; races fenced, no late candidate commit |
| GET /storyboards/{id}/candidates/{candidateId} | None | 200 `{baseRevision, scenes, changeSummary, estimatedDurationSeconds, expiresAt}`; owner and parent checked |
| POST /storyboards/{id}/candidates/{candidateId}/apply | `{expectedRevision}` | 200 new saved revision/hash; atomic CAS, candidate becomes applied |
| POST /storyboards/{id}/candidates/{candidateId}/discard | `{expectedRevision}` | 200 saved board reference; repeat is safe; never changes narration |
| POST /storyboards/{id}/generate | `{expectedRevision, planHash, confirmed:true}` | 202 `{jobId, versionId, storyboardRevision}`; pins settings from saved board, uses existing generation admission transaction |

Example: edit scene `scene-2` with `{expectedRevision:3, scope:"scene", sceneId:"scene-2", feedback:"Show water rising toward the cloud"}`. Poll the returned operation, review its candidate and apply at revision 3. Generate using returned revision 4 and its hash. Double-click Generate returns the same job; a different key also obeys the existing active-job invariant, never silently opens a different project's job.

Scenes are a bounded ordered list, not paginated. If revision history is exposed, use signed owner/board-bound cursor pagination, default 10/max 20, deterministic createdAt plus ID order; never page private scenes across owners. The exact OpenAPI schemas will be added with the API implementation slice; these paths are proposed, not callable today.

## 6. MongoDB design, retention and transactions

New collections (design only):

| Collection | Fields and relationships | Indexes |
|---|---|---|
| storyboardHeads | id, ownerId, projectId, currentRevision, planHash, settings, state, activeOperationId, pendingCandidateId, createdAt, updatedAt, expiresAt | unique projectId (one working board/project), ownerId+updatedAt+id, TTL expiresAt |
| storyboardSnapshots | id, ownerId, storyboardId, revision, schemaVersion, rendererVersion, plan, hash, createdAt, expiresAt | unique storyboardId+revision, TTL expiresAt |
| storyboardOperations | id, ownerId, storyboardId, baseRevision, kind, state, requestHash, idempotencyKey, leaseUntil, fence, candidateId, safeError, timestamps | unique ownerId+idempotencyKey; partial unique ownerId for queued/running; state+leaseUntil+createdAt; TTL purgeAt for terminal records only |
| storyboardCandidates | id, ownerId, storyboardId, operationId, baseRevision, plan, hash, changeSummary, state, expiresAt | unique operationId, storyboardId+state, TTL expiresAt |
| approvedStoryboards | id=versionId, jobId, ownerId, sourceStoryboardId, sourceRevision, schemaVersion, rendererVersion, plan, settings, hash, expiresAt | unique jobId, TTL expiresAt |

All foreign references require explicit owner equality; MongoDB does not enforce foreign keys. Reuse existing project/version/job IDs and validators. Enforce document and action-count caps below MongoDB's document limit. Idempotency receipts contain only safe IDs/status after content is removed.

Transaction boundaries: (1) reserve inference budget + command/head lock; (2) fenced candidate commit; (3) apply candidate with head-revision CAS + immutable snapshot insert + candidate terminal update; (4) generation admission with immutable approved snapshot + existing job/version/project mutations; (5) cancel/deletion fencing. Filebase writes are outside MongoDB transactions: use temporary keys, commit artifact references, and delete orphaned uploads with a reconciler. Concurrent project deletion or expiry must prevent result commit.

Proposed retention: an editable board and all its candidates/previews share a fixed two-hour deadline from the first successful plan. Editing does not extend it. A new plan after expiry is a new session requiring explicit action; saved topic/narrator/caption choices remain recoverable. Planning commands have a five-minute total deadline, 60-second lease renewed every 15 seconds and at most one recovery retry; all provider calls also use bounded timeouts. Pending planning commands have a bounded operation deadline and cleanup even if no plan succeeds. Serve 410 based on server time immediately; TTL deletion is asynchronous and is not authorization.

On Generate, copy the approved snapshot before preview expiry. Its job-owned copy survives queued/running work under the bounded job lifecycle, so preview expiry cannot break accepted jobs. On first Ready, move required revision plan data to the existing `revisionPlans` lifecycle and set its expiry to the project's original video deadline. On failure/cancellation retain the approved content for at most two hours after termination for recovery, then purge. Cleanup must never leave nonterminal jobs indefinitely: job timeouts/recovery run before pruning job-owned snapshots. Unchanged final MP4 policy: two hours from first Ready; revisions/caption variants inherit that exact deadline. Exclude ephemeral plan/prompt records from long-lived backups.

## 7. Existing-feature integration

| Features | Required behavior |
|---|---|
| F00–F03 homepage/auth | Preview is authenticated and private. No new account system; home demo must not imply generated preview audio. |
| F04–F05 drafts/choices | Retain original topic and choices. Editing topic after planning explicitly invalidates/replaces the plan; no silent overwrite. Missing voice blocks final generation with a replacement choice. |
| F06–F07 jobs | Use existing idempotency, owner concurrency, lease/fence and progress. Active video job does not hijack selected board navigation. Planning can be edited while rendering, but Generate remains blocked by the active-video rule. |
| F08–F10 media/library | Preview objects remain private/expiring. Show “Storyboard ready” separately from “Video ready”; download requires a real ready MP4. Reopening an expired board offers recreation from the saved idea. |
| F11–F12 ideas/preferences | Brainstorm selects a topic, not an approved plan. Reuse abuse controls and budget pool. Preference changes apply to new drafts; existing storyboard settings require explicit change. |
| F13 revisions | Pre-generation edits create no video versions. Post-generation revision stays a separate paid render using its source plan and original deadline. Do not retrofit or invent missing legacy source plans. |
| F14 captions | Preview caption toggle is illustrative; final captions use real alignment. Existing ready caption variants and their chosen artifacts remain immutable. |
| F15–F16 Instagram | No OAuth or publish action from a preview; only final ready artifact reaches publishing. Previously pinned posts keep their exact artifact/account even when the board changes. |
| F17–F18 planned work | Scheduling accepts ready media only within retention. Deletion cancels/fences storyboard work and removes previews/snapshots without affecting an already published Instagram copy. |

## 8. Stitch design brief and accessibility

Preserve the approved Daylight typography, colors, spacing and Moving Chitra identity. Extend existing Create, progress and library patterns. New proposed boards SB01 planning/loading, SB02 desktop scene overview, SB03 scene detail/motion preview, SB04 AI edit candidate comparison, SB05 validation/expiry/conflict/active-job states, SB06 mobile overview/detail. These IDs do not renumber the existing 24 boards. No screens have been generated for F19 yet.

One primary action per state; visible scope labels and feedback field; no technical jargon. Keyboard scene navigation, logical focus order, labeled controls, focus restoration after candidate apply, live-region status, reduced-motion support and accessible textual scene descriptions are acceptance requirements. Never rely only on color to identify changes. Small screens use one-column scene cards and a detail view, not a miniature desktop timeline. Prompt text survives network failures and conflict review; confirm navigation when unsaved text would be lost.

## 9. Verification and release gates

- Unit: plan bounds, narration cue references, scene IDs, algorithm continuity, estimate invalidation, canonical hashes, change scopes, unsupported visual actions and malicious content.
- MongoDB integration: cross-owner reads/writes, stale revisions, double submit/key mismatch, simultaneous apply/generate, one active AI operation, budget reservation, crash/lease recovery, late-result fencing, cancellation and deletion races.
- Provider fixtures: timeout, quota, malformed/too-long/too-short plans, invalid cue anchors, unsafe URLs, scene removal and one-scene edits that accidentally change another scene. No TTS/render invocation during planning. Invalid edits preserve exact saved bytes/hash.
- Rendering contract: representative water-cycle and linear/binary-search plans render through the same preview/final scene components; array operation order, labels and visual elements agree. Confirm actual narration alignment may change timing only. Validate final duration and actionable failure path.
- HTTP/browser: auth/CSRF/ownership, polling recovery after reload, keyboard/mobile/reduced motion, edit/apply/discard, counters at limits, expired preview, stale tab, voice loss, active-job navigation, generation replay and downloads. Fake clock proves fixed deadlines and TTL-independent access denial.
- Live opt-in walkthrough: Gemini creates plan → creator requests scoped edit → apply → approve → ElevenLabs → renderer → private Filebase → play/download. Record source revision/hash, job/version IDs, duration, layout parity and expiry; no credentials. Verify published/ready earlier artifacts unchanged. Publishing a test Reel requires a separate explicit user action.

Delivery slices: F19-A contracts/schema and design review; F19-B durable planning and private preview; F19-C AI/manual-narration candidates and safe apply; F19-D immutable approved-plan generation integration; F19-E browser/live QA and rollout. Each slice updates PROJECT_STATUS, runs relevant checks and commits/pushes dev. Existing jobs without approved snapshots continue the legacy planner; feature-flag rollout affects only new submissions. Rollback hides editor entry without breaking accepted jobs or losing their approved snapshot reader. Do not mark F19 Done until all gates and the live walkthrough pass. Existing F07 live Planning failures remain a separate blocker to end-to-end sign-off, not fixed by this document.
