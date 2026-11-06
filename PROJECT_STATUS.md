# ChitraBodh project status

Updated 6 November 2026. Use this file to choose the next feature and record what ships. The first dashboard milestone ends when an invited teammate can sign in, enter a topic, and download their narrated vertical video without using a terminal.

## Current baseline

| Capability | Implementation and evidence |
|---|---|
| AI storyboard and script | Implemented in the local engine. [Provider adapters](src/providers.ts) and [contracts](src/contracts.ts) handle structured plans and validation. |
| Narration and captions | ElevenLabs alignment drives caption and animation timing. Voice availability depends on account access. See [timing](src/timing.ts) and [recorded voice tests](docs/Prototype-Implementation-Status.md). |
| Motion graphics and MP4 | The [renderer](src/render.ts) and [video compositions](src/video) produce topic-specific vertical explainers. A previously verified narrated export ran 70.933 seconds at 1080 × 1920. |
| Local creator portal | The [portal](src/portal.ts) accepts a topic, voice and caption choice and reports job progress. The prototype uses [local storage](src/storage.ts). Shared accounts, durable jobs and hosted storage are upcoming work. |
| Product and design | [System](docs/ChitraBodh-Dashboard-System-Design.md), [API](docs/ChitraBodh-API-Design.md) and [database](docs/ChitraBodh-Database-Design.md) contracts exist. All 24 application boards received [content QA](docs/design/Stitch-Screens-QA.md). Screen corrections and visual and interaction testing remain open. |

Baseline established from repository inspection and recorded prototype results. Live generation and current provider eligibility were not retested on 5 November.

## Feature queue

**Integration verification:** F02–F08. Invite lookup, link issuance and the dependent F03 session boundary are implemented. Next, verify the MongoDB and SMTP path with test accounts, then save, reload and check draft isolation. Keep one implementation slice active. Each row can be reviewed against its finish condition using fixtures or a test adapter until its integration dependencies land.

| ID | Feature | Depends on | Status | Finish condition |
|---|---|---|---|---|
| F00 | Public homepage and product navigation | Daylight design | Done | Home opens at / with topic illustrations, invite-only sign-in and workspace preview links. |
| F01 | Next.js dashboard shell | Daylight design | Done | My videos, Create and Settings routes open directly and through keyboard-accessible desktop and mobile navigation. My videos has an empty state. |
| F02 | Invite-only email link | MongoDB user and token records | Awaiting integration verification | An invited user receives a single-use, expiring link. All addresses receive the same on-screen response. |
| F03 | Session and private routes | F01, F02 | Awaiting integration verification | Redeeming a valid link opens the dashboard. Signed-out access redirects to sign-in and sign-out revokes access. |
| F04 | Topic draft | F03 | Awaiting integration verification | A user can save and reopen their own idea of up to 2,000 characters. Another user cannot read it. |
| F05 | Narrator and caption choices | F04, prototype voices | Awaiting integration verification | A draft retains the selected available voice and captions setting across reloads. |
| F06 | Submit one generation job | F05 | Awaiting integration verification | Submission creates a durable job. Double-clicks and simultaneous submissions from the same user produce one outstanding job. |
| F07 | Worker and progress | F06, local pipeline | Awaiting integration verification | One worker processes queued jobs in order. Users can leave and return to see the current stage, failure or cancellation. |
| F08 | Private media and expiry | F07 | Awaiting integration verification | Completed media goes to R2. Access closes two hours after first ready, and cleanup removes expired objects. |
| F09 | Ready video and download | F08 | Planned | The owner can play and download the selected 9:16 MP4 before expiry. Expired projects offer fresh creation from the saved idea. |
| F10 | My videos list | F04, F07, F09 | Planned | A user sees only their projects, with current state, expiry and pagination. Complete the first milestone with a real invited teammate. |
| F11 | Optional idea assistant | F04 | Planned | Up to three suggestions fill the draft only when selected. Generation requires a separate click. |
| F12 | Saved preferences | F05 | Planned | Voice, captions and timezone persist. New drafts inherit defaults and existing videos retain their settings. |
| F13 | Revisions | F06–F09 | Planned | A revision preserves the previous ready version and original expiry, including when revision fails. |
| F14 | Caption variants | F13 | Planned | A caption change renders a separate variant under the same job limit. Only ready variants can be exported. |
| F15 | Instagram connection | F03 | Planned | Connect, disconnect and reconnect an eligible account. Existing posts retain their intended account. |
| F16 | Publish now | F09, F15 | Planned | User confirms account and ready artifact. Eligibility is rechecked. An uncertain result offers a status check and prevents duplicate submission. |
| F17 | Schedule and manage a post | F16 | Planned | Pin the account, version and captions. Enforce server time bounds, edit or cancel before dispatch, and require explicit resume after reconnection. |
| F18 | Project and account deletion | F03, F08, F17 | Planned | Confirm deletion, require fresh sign-in for account deletion, handle pending work and preserve the published Instagram copy. |

Apply the [screen QA findings](docs/design/Stitch-Screens-QA.md) to each affected slice before accepting it. The dashboard milestone ends at F10. Instagram work starts after the generation and download path is usable.

## Keeping this record current

1. When starting a slice, mark it **In progress** and identify the specific finish condition being built. Use **Blocked** with a reason and unblock step if work stops.
2. In the same change as the implementation, update its row and add a dated entry below with files or PR, checks run, outcome and remaining gaps. Use **Done** once the finish condition works through the intended entry point.
3. If a feature is reopened or split, retain its ID and history, update dependencies and name the next ready slice. Keep detailed requirements in the linked contracts.

| Date | Change | Verification and next step |
|---|---|---|
| 5 Nov 2026 | Established the prototype baseline and dashboard feature queue. | Reviewed package dependencies, source inventory, prototype notes and design QA. Next feature is F01. |
| 5 Nov 2026 | F01 completed in [dashboard/pages](dashboard/pages). Responsive navigation, empty library and destination pages are available. | Production build passed. HTTP checks verified the root redirect, three direct routes, headings, navigation targets and current-page marker. Physical phone and keyboard walkthrough pending. Next is F02. |
| 5 Nov 2026 | F02 started with a [sign-in form preview](dashboard/pages/sign-in.js). | Browser-local email validation and generic confirmation. MongoDB invite lookup and email delivery are pending. |
| 5 Nov 2026 | F00 added as the product entry point. Home links to sign-in and workspace preview. Workspace links to library, Create and Settings. Brand links return home. | Water-cycle and linear-search illustrations provide the demo scaffold. Reviewed public MP4 and live authentication remain pending. Next feature is F02 invite lookup. |
| 5 Nov 2026 | Applied the [Moving Chitra identity](docs/design/Moving-Chitra-Logo.md) across the web shell and favicon. | Verified the five generated pages reference both assets and inspected the logo preview. Next feature is F02 invite lookup. |
| 5 Nov 2026 | F02 and F03 implemented in dashboard/server, the auth API, sign-in form and workspace routes. SMTP selected as the delivery interface. | 41 tests passed including captured-mail auth lifecycle with isolated storage. Production build passed and all three private routes redirected signed-out HTTP requests. Configure dashboard/.env.local and verify MongoDB, throttling, actual inbox delivery and signed-in browser access before closing these slices. |
| 5 Nov 2026 | F04 added the [topic editor](dashboard/pages/create.jsx) and [owner-scoped draft persistence](dashboard/server/drafts.mjs). Create reopens the latest draft or the draft named in its private URL. | Isolated tests passed for validation, cross-user access, retry and conflicting edits. Signed-out endpoint requests returned 401 and the editor redirected to sign-in. Live signed-in MongoDB/browser verification remains pending. Next feature is F05 voice and caption choices. |
| 6 Nov 2026 | Adopted per-step GitHub checkpoints in AGENTS.md. | Each completed step includes a scoped commit, push and remote verification. |
| 6 Nov 2026 | F05 added narrator and caption controls to Create and stored both choices on private drafts. Older drafts default to Adam with captions on. | Draft tests covered reload, unavailable voices, invalid caption values, retries, legacy defaults and topic-only edits. Signed-in MongoDB/browser check pending. Next is F06 generation submission. |
| 6 Nov 2026 | F06 added generation submission for new topics and saved drafts, an owner-only receipt endpoint, and a queued state in Create. The transaction writes the project, version snapshot and job together. | 45 tests passed, including simulated duplicate-key races, retries, private ownership and stale revisions. Live MongoDB replica-set concurrency and signed-in browser checks remain pending. F07 connects the worker to queued jobs. |
| 6 Nov 2026 | F07 and F08 connected queued jobs to the existing pipeline via a serial child-process supervisor, owner-only progress/cancel routes, private R2 uploads and an independent cleanup loop. | 53 regression tests passed, TypeScript and production build passed, and HTTP checks rejected signed-out job/media access. Unit and child-process tests cover FIFO, single slot, cancellation, rollback, owner access, fixed two-hour expiry and deletion retry. MongoDB and R2 configuration is missing, so live generation-to-bucket, browser playback and actual database concurrency remain unverified. Supervisor crash recovery requires confirmed process-tree shutdown on the original host. Next is F09 ready playback/download UI. |
| 6 Nov 2026 | Created dev from the F07/F08 checkpoint for ongoing development. | Future feature commits go to origin/dev. Reviewed milestones reach main through a pull request after release approval. |
