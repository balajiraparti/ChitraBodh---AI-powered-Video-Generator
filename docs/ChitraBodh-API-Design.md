# ChitraBodh — V1 API Design

Version 1.0 · 31 October 2026 · **Proposed contract; not implemented endpoints.**

This specification refines the [PRD](ChitraBodh-V1-PRD.md) and [dashboard system design](ChitraBodh-Dashboard-System-Design.md). Read it with the [database design](ChitraBodh-Database-Design.md) and authoritative wire contract, [OpenAPI JSON](api/chitrabodh.openapi.json). Existing localhost prototype endpoints remain described separately in [Local Portal API](Local-Portal-API.md). No live infrastructure or credentials are changed by these documents.

## 1. Scope and contract decisions

Creator pilot: self-register with email and password, create or brainstorm an idea, generate a vertical narrated motion explainer, revise, preview/download, and explicitly publish/schedule to one connected Instagram account. No billing, analytics, custom branding, or YouTube publishing.

Video target remains 60–90 seconds, with complete 40–90-second lessons accepted. One outstanding generation/revision/variant job per user; one executing globally. First ready media expires in two hours; derivatives inherit earlier dependency expiry. API success never bypasses ownership, expiry, or renderer validation.

Refinements to the system design:

- Stable application-owned authentication facade under `/api/v1/auth` shields the UI from library response changes. Better Auth remains responsible for actual verification/session security behind the facade; `/api/auth/*` is an internal integration surface, not a second public product contract.
- Use `expectedRevision` consistently in mutable command bodies, rather than mixing `revision` and `expectedRevision`.
- Dashboard lists sort by immutable `createdAt DESC, id DESC`, not changing `updatedAt`, to avoid cards moving between cursor pages during progress updates.
- Add explicit list routes for versions/publications, active-job discovery, thumbnail/sample access, publication eligibility/resume, and bounded lifecycle deletion operations.
- No arbitrary script/storyboard editing endpoint. Internal generated content is not exposed as a permanent downloadable API resource.

The JSON contract defines field types, required properties, route security, and HTTP response schemas. This guide defines cross-record checks and side effects. The database guide defines persistence invariants. Update all three together for changes; published deployment behavior must be tested before claiming compliance.

## 2. Transport, security, and common validation

Base path `/api/v1`, same-origin HTTPS. Local OpenAPI server URL is a development example, not proof that these routes exist on port 4173. Application responses use UTF-8 JSON, `Cache-Control: private, no-store`, and `X-Request-ID`. JSON dates are RFC3339 UTC with `Z`; IDs are UUIDs except auth subjects and curated voice IDs. Omit unavailable optional fields; use null only where the schema explicitly permits it.

Cookie session name proposed: `__Host-chitrabodh.session`; configure the auth adapter to match it. Cookies are HttpOnly, Secure, Path=/, no Domain, SameSite=Lax unless a verified provider flow requires another policy. Never return the session token in JSON. Seven-day absolute sessions are the initial policy default. Email/password registration and sign-in are required; passwords are accepted only over HTTPS and are never logged, returned, or stored by application code.

`GET /auth/csrf` returns a short-lived token bound to the current session or pre-auth browser nonce. All browser mutations require `X-CSRF-Token` and an exact allowed Origin. Sign-in initiation is rate-limited and protected too. Provider callbacks use one-use state/token verification instead of this header. This supplements the auth library's protections; it does not replace them. No wildcard credentialed CORS.

Middleware order: request ID → method/body size/content type → authentication where required → deletion checks → CSRF/origin → input schema → ownership → idempotency replay → state/time/business rules → transaction → response DTO validation. Do not expose whether another user's resource or command exists. A disconnected DB fails closed.

Input checks:

| Input | Rule |
|---|---|
| JSON bodies | ≤32 KiB, objects only; unknown fields rejected; malformed JSON 400; unsupported content type 415; too large 413 |
| Topic | Trim ends; 1–2,000 Unicode code points; reject whitespace-only; do not require a minimum word count |
| Project title | Trim; 1–120 code points; render as escaped plain text |
| Revision instruction | Trim; 1–1,000 code points |
| Brainstorm message | Trim; 1–1,000; bounded server-side history; never accept client-supplied assistant/system messages |
| Post description | 0–2,200 code points as initial product cap, also validate the active Meta profile at dispatch; not a claim of permanent provider limits |
| Voice | Enabled curated catalog ID, selected model compatibility, actual account accessibility; never accept an arbitrary provider voice IwD |
| Language | `en-IN` working launch default; voice accent metadata must be truthful; Hindi/Hinglish unsupported until separately validated |
| Timezone | Actual IANA zone, validated by timezone database, not just regex |
| Date/time | Valid UTC instant; server clock is authoritative; reject past/ineligible schedules |
| Settings | Explicit booleans, finite numbers; no string coercion; reject client overrides of provider, model, duration, owner or storage key |
| Partial update | `expectedRevision` plus at least one editable field; no null-as-delete convention |

Response checks: whitelist DTO fields (never serialize a MongoDB document wholesale); enforce schema in contract tests and validation at application boundaries; finite media values; owned child IDs; safe relative media URLs; no raw provider bodies, keys, tokens, stack traces, local paths, or storage keys. A persisted invalid DTO becomes a sanitized internal error, not a malformed 200 response.

## 3. Authentication lifecycle

| Method/path | Input → success | Checks and behavior |
|---|---|---|
| `GET /auth/csrf` | none → 200 `{csrfToken,expiresAt}` | May set secure pre-auth nonce cookie; no session required; no-store |
| `POST /auth/sign-up` | `{email,password}` → 200 session view | CSRF; normalize email; password 12–128 characters; rate limit registration; duplicate account returns safe error; set secure session cookie |
| `POST /auth/sign-in` | `{email,password}` → 200 session view | CSRF; rate-limit by normalized email and IP; generic invalid-credential response; set secure session cookie |
| `GET /auth/session` | none → 200 session view | Returns `{authenticated:false,serverNow}` when signed out; signed-in response includes user and expiresAt; no secret |
| `POST /auth/sign-out` | no body → 204 | CSRF; revoke current session and clear cookie; repeated valid requests safe |
| `GET /me` | session → 200 profile/settings | Includes current user, preferences, serverNow |
| `PATCH /me/preferences` | settings + expectedRevision → 200 preferences | Validate enabled voice; changing defaults never changes queued jobs or old outputs |
| `DELETE /me` | `{confirm:true,expectedRevision}` → 202 deletion receipt | Idempotency-Key required; fresh authentication ≤10 minutes; tombstone user/revoke sessions immediately; background deletion continues |

Registration is self-service; there is no operator invite allowlist. Do not apply Gmail-specific dot/plus rewriting. Rate-limit registration and sign-in per normalized email and IP; invalid credentials and duplicate-account errors must not expose secrets. Apply a password minimum of 12 characters and a maximum of 128 characters. Password hashing, comparison, and session handling remain the auth library's responsibility; no SMTP outbox is needed for this authentication flow.

Better Auth provides email/password and session functionality; its exact adapter mappings must be pinned and tested when implemented. Our facade shapes above are application decisions, not a representation of the library's native API. [Better Auth email/password documentation](https://www.better-auth.com/docs/authentication/email-password)

## 4. Pagination, filters, and polling

All growing lists use `limit` (default 20, minimum 1, maximum 50) and opaque `cursor` (≤2,048 chars). Response:

```json
{"items":[],"page":{"limit":20,"hasMore":false,"nextCursor":null},"serverNow":"2026-10-31T10:00:00Z"}
```

Projects, versions, and publications sort by `(createdAt DESC, id DESC)`. Cursor contents include version, owner binding, route/filter hash, first-page upper bound, last timestamp/ID, and 15-minute expiry; sign with HMAC, validate in constant time, and do not embed topics or secrets. Query the next page with `createdAt < lastTime OR (createdAt = lastTime AND _id < lastId)`, plus the first-page upper bound and owner/filter predicates. Fetch limit+1, return at most limit. No total count or offset/page number.

Filters: projects `filter=all|scheduled`; publications `state=<PublicationState>` and optional projectId. Versions are scoped by project. Curated voice catalog is bounded to 50 and unpaginated. Unknown filters/sorts return 400. Invalid/tampered/wrong-owner cursor returns 400 INVALID_CURSOR; expired cursor returns 400 CURSOR_EXPIRED; UI restarts listing. Different filters require a fresh cursor.

This is stable keyset traversal, not snapshot isolation: deletion/expiry and mutable status filters can change membership while paging. Newly created records appear after refresh, not inserted halfway into the first-page boundary. Never promise a frozen result set. Auth and expiry are evaluated on each page.

Poll active jobs every three seconds, back off to 15 seconds on transient network failures, refresh on focus. Use returned `stateRevision` to discard older responses. Return serverNow for countdowns; do not send invented progress percentages or guaranteed queue ETAs. `GET /jobs/active` returns `{job:null}` when none exists.

## 5. Endpoint catalog and command semantics

Paths below are relative to `/api/v1`. All require session unless explicitly stated. `I` means Idempotency-Key required; `C` means CSRF required. Full fields and response schemas are in OpenAPI.

### 5.1 Ideas, projects, and preferences

| Method/path | Request → response | Checks / failures |
|---|---|---|
| `GET /voices` | → 200 voices | Bounded curated catalog, compatibility/enabled metadata; no paid-access promise |
| `GET /voices/{voiceId}/sample` | → 200 audio or 404 | Only permitted curated sample; session, no live synthesis on click |
| `GET /projects` | cursor/limit/filter → 200 ProjectPage | Owner/live-project filter; states computed from authoritative children |
| `POST /projects` I C | `{topic,title?}` → 201 Project | Draft only; Location header; no provider call |
| `GET /projects/{projectId}` | → 200 Project | Includes selectedVersionId/activeJobId when applicable; not all history |
| `PATCH /projects/{projectId}` C | `{expectedRevision,title?,topic?}` → 200 Project | Topic editable only before first version; later changes use revision or new generation |
| `DELETE /projects/{projectId}` I C | `{expectedRevision}` → 202 DeletionReceipt | Tombstone before purge; cancels pending jobs; in-flight publication may complete |
| `POST /ideas/brainstorm` I C | `{draftId or conversationId, message}` → 200 BrainstormReply | Owned ungenerated draft or owner-scoped unsaved editor; exact Origin + JSON; one in-flight brainstorm/user; max six recent pairs/8,000 input chars; six requests/minute |
| `GET /projects/{projectId}/versions` | cursor/limit → 200 VersionPage | Metadata only; includes expired states, never expired scripts |
| `POST /projects/{projectId}/selection` C | `{versionId,expectedRevision}` → 200 Project | Same project/owner, ready and unexpired; no change to publication payload |

Brainstorm returns short reply, one to three suggestions, and history expiry. It cannot generate/publish on its own. An expired cached brainstorm command returns 410 RESULT_EXPIRED instead of spending another model call. After a response is lost while inference is underway, return 409 COMMAND_IN_PROGRESS with Retry-After; same key polls/retries safely. Account-wide generation and brainstorm limits are separate.

### 5.2 Generation, revision, and artifacts

| Method/path | Request → response | Checks / failures |
|---|---|---|
| `POST /generations` I C | Exactly one of topic or projectId; preferences overrides → 202 GenerationReceipt | Existing project also requires expectedRevision; owned live project; snapshot topic/settings; unique active-owner admission |
| `POST /projects/{projectId}/revisions` I C | `{sourceVersionId,instruction,expectedRevision,voiceCatalogId?,captions?}` → 202 receipt | Source same project, ready/unexpired; new immutable version |
| `GET /jobs/active` | → 200 nullable job | Discover active work after reload |
| `GET /jobs/{jobId}` | → 200 Job | State/stage/budget-independent safe error; no secret/provider content |
| `POST /jobs/{jobId}/cancel` I C | `{expectedRevision}` → 200 Job | Queued cancellation immediate; running becomes cancel_requested; completed state conflict |
| `POST /jobs/{jobId}/retry` I C | `{expectedRevision}` → 202 receipt | Only failed/cancelled jobs; new job, fresh budget; no still-active original; validate dependencies |
| `GET /versions/{versionId}` | → 200 Version | Version metadata and artifact variants; expired version still inspectable |
| `POST /versions/{versionId}/variants` I C | `{captions}` → 200 Artifact or 202 receipt | Same variant ready returns 200; same variant job returns 202; otherwise enforce active-owner constraint |
| `GET/HEAD /artifacts/{artifactId}/media` | `download?`, Range → 200/206 | Ready/unexpired owned artifact; exact chosen variant; 410 expired, 409 not ready |
| `GET/HEAD /artifacts/{artifactId}/thumbnail` | → 200 image | Same ownership/retention checks; thumbnail may be unavailable independently |

Fresh full generation on an existing expired project is explicit and receives a new version/window; it does not restore the old output. Retry of failed initial/revision generation creates a new version to keep attempt history immutable; retry of a failed caption render targets the same content version/variant slot. Update pointers transactionally. Retry cannot rehydrate a purged revision instruction: return 410 RESULT_EXPIRED and ask for a new revision instead.

For visual-only revisions, application equality checks, not the model's assertion alone, decide whether audio/timings can be reused. Variant and reused-audio jobs inherit earliest dependency expiry. Do not silently extend or synthesize to bypass expiry.

### 5.3 Instagram and publications

| Method/path | Request → response | Checks / failures |
|---|---|---|
| `POST /instagram/connect` C | `{returnPath}` → 200 authorizationUrl/expiresAt | One-use state bound to session; no arbitrary return URL; no token to browser |
| `GET /instagram/callback` | state plus code OR provider error → 303 | No session required by transport, but state binds initiating identity; recheck account state; fixed redirect; no raw provider error |
| `GET /instagram/connection` | → 200 nullable Connection | Safe identity/status/scopes summary, no encrypted or plaintext tokens |
| `DELETE /instagram/connection` I C | `{expectedRevision}` → 202 DeletionReceipt | Immediately block new dispatch, cancel pending posts, delete token; may not undo in-flight work |
| `GET /publication-eligibility` | artifactId, connectionId → 200 Eligibility | Server-computed post-now ability and inclusive schedule interval; reasons when blocked |
| `POST /publications` I C | artifact/account/description; mode now or schedule → 202 Publication | Explicit intent; pin artifact, variant, account identity, description; active duplicate returns existing job ID in 409 |
| `GET /publications` | cursor/limit/state?/projectId? → 200 PublicationPage | Private job history; no expired description content |
| `GET /publications/{publicationId}` | → 200 Publication | Confirmed mediaId/permalink only; unknown outcome is separate state |
| `PATCH /publications/{publicationId}` C | expectedRevision and time/description/artifact → 200 Publication | Scheduled/preparing/ready_to_publish/retry_wait only; reject after dispatch; new payload invalidates prepared container/fetch token |
| `POST /publications/{publicationId}/cancel` I C | `{expectedRevision}` → 200 Publication | Predispatch CAS; publishing/unknown returns 409 DISPATCH_STARTED |
| `POST /publications/{publicationId}/resume` I C | `{expectedRevision,mode,dueAt?,timezone?}` → 202 Publication | Only needs_reconnection with same verified account, unexpired media and surviving description; explicit renewed timing intent |
| `GET/HEAD /publishing-media/{token}` | Range → 200/206 MP4 | No session/CSRF; high-entropy bearer capability bound to one job/artifact; validate hash/revocation/expiry every request |

Initial scheduling defaults: at least ten minutes ahead, no later than media expiry minus 15 minutes; post-now needs at least five minutes remaining. Deadline is earlier of dueAt+15 minutes and media expiry (createdAt+15 for now). DueAt is UTC; timezone is required for schedule display, validated and stored. UI must resolve ambiguous/nonexistent local time before converting to UTC. Server never interprets a bare local time. Eligibility is advisory and rechecked in create/update/dispatch transactions.

Do not create a resume endpoint for outcome_unknown: unknown publication needs reconciliation, not another publish request. After a confirmed terminal failure, a new explicit publication may be created if media remains eligible. Changing connection identity never retargets an existing job. Exact Meta API version/scopes/container rules remain an integration gate as stated in system design, not fabricated endpoint guarantees here.

Media route: one byte range, including suffix/open-ended ranges; multiple/invalid/unsatisfiable ranges return 416 with `Content-Range: bytes */size`. Successful responses include Accept-Ranges, Content-Type, Content-Length, and Content-Range for 206. HEAD has equivalent headers/status and no body even on errors. Authenticate before revealing size. Browser media uses private/no-store; Meta capability paths must be redacted from every log. Expiry denies new requests; previously downloaded bytes cannot be recalled.

## 6. Idempotency and optimistic concurrency

Use a client-generated UUID Idempotency-Key for every `I` endpoint. Scope uniqueness by owner, command type, and key. Hash canonical JSON after documented normalization; preserve narration and post-description internal whitespace. Include target resource and expectedRevision in hash. Same key+same hash returns original status/resource, with `Idempotency-Replayed: true`; same key+different hash is 409 IDEMPOTENCY_CONFLICT. A retry after terminal failure is a new explicit command/key.

Replay valid committed intent before testing a now-stale expectedRevision, but after identity/ownership/tombstone checks. Never replay secret URLs or revoked access. Keep commands at least 24 hours and longer while their linked work is nonterminal; TTL must not erase an in-flight/uncertain intent. After retention, clients must reconcile resources before retrying an old key. Tombstoned result returns 410 rather than recreating work. Non-idempotent external requests are not assumed safe simply because local commands deduplicate.

Mutable DTOs expose `revision` (jobs use `stateRevision`); mutations require expectedRevision except create/variant/independent commands explicitly listed. CAS mismatch is 409 REVISION_CONFLICT with currentRevision, no silent last-write-wins. Every authorization-sensitive transition touches shared guard documents in the DB transaction, not just snapshot-reads them, to serialize against deletion/revocation.

## 7. Errors, limits, and examples

Uniform application error body:

```json
{"error":{"code":"VALIDATION_FAILED","message":"Check the highlighted fields.","retryable":false,"requestId":"req-example","details":[{"path":"topic","code":"too_long","message":"Use at most 2000 characters."}]},"serverNow":"2026-10-31T10:00:00Z"}
```

Do not echo rejected text or sensitive field values. Error details use dot paths, numeric indices where relevant. Aggregate safe field errors in one response. Callbacks redirect safe codes; HEAD/media errors carry status/headers instead of forcing JSON into binary responses.

| Status | Codes | Client behavior |
|---|---|---|
| 400 | INVALID_JSON, INVALID_CURSOR, CURSOR_EXPIRED, INVALID_QUERY | Correct request/restart list |
| 401 | SESSION_REQUIRED, REAUTHENTICATION_REQUIRED | Sign in; retain safe draft in memory |
| 403 | CSRF_FAILED, INVITE_REVOKED | Refresh security context or contact operator |
| 404 | NOT_FOUND | Missing or other-user resource; no ID enumeration |
| 409 | ACTIVE_JOB_EXISTS, ACTIVE_PUBLICATION_EXISTS, REVISION_CONFLICT, INVALID_STATE, DISPATCH_STARTED, COMMAND_IN_PROGRESS, IDEMPOTENCY_CONFLICT | Open existing job, reload, or reconcile; do not blindly retry a mutation |
| 410 | MEDIA_EXPIRED, DEPENDENCY_EXPIRED, RESULT_EXPIRED | Explicit new generation/input required |
| 413/415 | BODY_TOO_LARGE, UNSUPPORTED_MEDIA_TYPE | Correct payload |
| 416 | RANGE_NOT_SATISFIABLE | Retry valid media range |
| 422 | VALIDATION_FAILED, VOICE_UNAVAILABLE, UNSUPPORTED_LANGUAGE, SCHEDULE_OUTSIDE_WINDOW | Fix field or selection |
| 429 | REQUEST_LIMITED | Honor Retry-After seconds |
| 500 | INTERNAL_ERROR | Safe generic error + request ID; reconcile mutation result before retry |
| 503 | SERVICE_UNAVAILABLE | Preserve draft; back off; use same key if result unknown |

Async failures are returned inside Job.safeError/Publication.safeError on a successful status GET, not as HTTP 500: STORYBOARD_INVALID, DURATION_INVALID, ALIGNMENT_INVALID, PROVIDER_UNAVAILABLE, PROVIDER_QUOTA, VOICE_UNAVAILABLE, RENDER_FAILED, STORAGE_FAILED, DEPENDENCY_EXPIRED, QUEUE_TIMEOUT, TIMEOUT. Retryable means a new attempt may help; it is not permission for an automatic unlimited loop.

Rate defaults: normal authenticated reads 120/minute/user; new generation commands 10/minute plus one outstanding; brainstorming six/minute and one in flight; email limits above. Media needs a separate generous concurrent-stream/range policy, not the JSON request bucket. Return Retry-After on 429 and transient command-in-progress. No customer quota wallet or analytics UI.

Example accepted generation:

```http
POST /api/v1/generations
Content-Type: application/json
Idempotency-Key: 00000000-0000-4000-8000-000000000001
X-CSRF-Token: <browser token>

{"topic":"Explain linear search","voiceCatalogId":"test-adam","captions":true}
```

```json
{"projectId":"10000000-0000-4000-8000-000000000001","versionId":"20000000-0000-4000-8000-000000000001","jobId":"30000000-0000-4000-8000-000000000001","state":"queued","statusUrl":"/api/v1/jobs/30000000-0000-4000-8000-000000000001","serverNow":"2026-10-31T10:00:00Z"}
```

Example concurrency rejection: `409 {error:{code:"ACTIVE_JOB_EXISTS",message:"Your video is already being created.",retryable:false,requestId:"req-example",jobId:"..."},serverNow:"..."}`. Example expired owned download: 410 MEDIA_EXPIRED; another user's same ID is 404. Example schedule just beyond latestScheduleAt: 422 SCHEDULE_OUTSIDE_WINDOW with a `dueAt` field detail; no publication inserted.

## 8. State contract and verification

The exact generation/publication/connection/media enums are shared with the [database transition tables](ChitraBodh-Database-Design.md#5-state-transitions). Clients must not change state directly. Public project status is a projection: active job status, selected media status, and publication status remain separate. Completed generation stays succeeded after its media expires; publication can stay published after local deletion.

OpenAPI 3.1.1 is chosen for JSON Schema tooling compatibility, not as a claim to be the newest specification. JSON and YAML are equivalent supported contract representations. [OpenAPI specification](https://spec.openapis.org/oas/v3.1.1.html)

Contract acceptance checks before implementation release:

1. Validate OpenAPI structure, references, unique operation IDs, path parameters, security declarations, and example payloads.
2. Verify every route's missing session/CSRF, other-owner IDs, malformed/oversized/unknown fields, invalid timezone, and stale revision cases.
3. Test cursor boundaries with equal timestamps, changing states, deletions, new inserts, changed filters, tampering and expiry.
4. Run simultaneous create commands with same/different keys and users; verify single active-owner job and global execution slot.
5. Test cancellation versus ready/publish, deletion versus upload/admission, lease loss and restart, exact expiry boundaries, lost provider response and command replay.
6. Assert response DTO redaction, no-store headers, HEAD/range behavior, cookie security, safe redirects, and schema-compatible errors.
7. Perform authorized live voice/storage/Instagram checks separately; mock/spec validation proves neither account permissions nor external provider delivery.

The machine-readable contract can drive UI fixtures and mock responses for Stitch-derived screens. It does not publish an API or make the current local portal comply automatically.

Brainstorm inference requires a verified email or an administrator-approved pilot account. To approve a teammate, verify their identity and set `brainstormApproved: true` on their existing MongoDB `user` record by its exact account ID. Registration never sets this field. Each owner has six admissions per minute and the whole installation has 60 per rolling 24 hours, including recovery attempts. Each admission permits at most two configured Gemini model requests. Cached replies consume no budget. Set `AI_PROVIDER=gemini` for normal operation. NVIDIA is a manual backup. A retry can reclaim an expired running command under its original key. Only the current attempt may publish its reply.
