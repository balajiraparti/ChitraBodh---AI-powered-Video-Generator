# ChitraBodh Stitch design QA

Initial review on 4 November 2026. Remaining boards reviewed on 5 November 2026.

## Completed review of the remaining 18 boards

**Decision — correct the publishing states before handoff.** On 5 November I read the rendered content and control labels inside each of the 18 remaining screen documents on the live Stitch canvas. Combined with the six boards below, all 24 now have direct content QA. This follow-up inspected the Windows accessibility tree for each board. Click-through behavior, pixel layout, keyboard operation, real media and backend enforcement remain separate checks.

Each outcome applies to the check named in its row. “Revise” identifies a visible discrepancy. “Pass” means the inspected state communicated the expected behavior.

| Screen | Check and outcome | Evidence and action |
|---|---|---|
| 01 Sign in | Invite-only entry — Pass | Email field, single-use invitation wording and Send sign-in link give the creator one clear action. |
| 02 Check your email | Recovery and resend — Revise | Generic confirmation, masked recipient, ten-minute validity, change-email and expired-link recovery are present. The resend button says throttling is active in its description but exposes no disabled state. Show the remaining wait and expose disabled semantics during cooldown. |
| 03 My videos | Busy state and sharing — Revise | Create is disabled during generation. Ready cards expose “Share link” while V1 supports Instagram sharing. Label the action “Share to Instagram” and route it to account/version review. |
| 04 Empty dashboard | First creation — Revise | The initial CTA and two-hour availability message are clear. Remove “ID: SPEC-EMPTY-04” and the repeated retention notice from the creator view. |
| 05 Create video | Composer — Revise | Topic, idea help, voice selection and captions appear together. The example topic field and static “142 / 2000 characters” counter should use a single source for the count. Label 60–90 seconds as typical to accommodate shorter valid videos. |
| 07 Creating your video | Progress and cancellation — Pass | Five stages lead from queue to final review, with drawing marked in progress. Cancel opens a represented confirmation with “Keep generating.” Verify draft preservation when wiring cancellation. |
| 08 Video ready | Review and expiry — Revise | 01:14 sample, vertical MP4 download, Instagram share and original 16:00 expiry are present. Replace “EPHEMERAL RETENTION WINDOW” with “Available until” and remove “PROJECT SYNTHESIS METADATA” from the review flow. |
| 09 Revision and versions | One outstanding job — Pass | Create is disabled during revision, the caption alternative also disables creation, and the previous ready version is explicitly available until 16:00. |
| 10 Failed and expired | Recovery — Revise | Failed work offers retry/edit. Expired media disables play/download and offers fresh generation. A stopped job says “Resume generation.” Use “Create again from draft” so the action accurately describes a new job. |
| 11 Share to Instagram | Explicit publishing intent — Pass | Review identifies Version 1, captions ON, destination account, editable description and expiry. The disconnected specimen offers Connect Instagram and says the description is preserved. |
| 12 Schedule Instagram post | Time boundaries — Revise | 14:40 earliest, 15:45 latest, 15:50 invalid and the five-minute immediate-post guard are represented. Remove the claim that the bounds “ensure posts finish delivery.” Eligibility determines when submission is allowed, while delivery can still fail. |
| 14 Publication results | Safe retry and reconnect — Revise, high priority | Unknown outcome correctly offers Check status again. Confirmed failure offers “Retry publishing (before 16:00),” which can include the last five minutes. Gate retries on current publishing eligibility. Separate “Reconnect” and “Resume” so the creator confirms after identity verification. |
| 19 Mobile dashboard | Library card actions — Revise | Expired cards offer fresh creation and the library exposes Load more. The scheduled Photosynthesis card offers “Edit prompt” beside its dispatch time. Use “Edit schedule” and “Cancel post” for eligible pending posts. Keep the selected video version pinned. |
| 20 Mobile create and ideas | Idea selection — Pass | All three suggestions have “Use this idea,” separate from “Create video.” Voice samples, captions, draft feedback and assistant retry are represented. Verify selection only fills the field in the implementation. |
| 21 Mobile generation | Stage clarity — Revise | Queued, active, cancellation, stopped and failed states have next actions. Remove “SEQUENTIAL SYNTHESIS PIPELINE,” worker terminology and layer telemetry. Match the plain-language stages on 07. |
| 22 Mobile review | Caption variant progress — Revise | Pending download is disabled and the earlier captioned video remains playable. Replace “Compiling 65%” with “Preparing video without captions” until measured progress is available. |
| 23 Mobile publishing | Retention and scheduling boundary — Revise, high priority | The same board says media lives for 90 minutes and that posting must be “before 15:45.” Actual retention is two hours from first ready and 15:45 is inclusive in this example. Match 12, accept 15:45, reject 15:50, and use the expiry returned for the selected artifact. Preserve the separate Resume action and unknown-outcome status check. |
| 24 Mobile settings and sign-in | Access and account deletion — Revise | Ten-minute links, resend countdown, voice samples and recovery are visible. Remove the unsupported browser-token and cookie claims. Explain fresh sign-in before account deletion and the possibility that dispatched publications may finish. |

**Follow-up outcome:** five of the selected content checks passed and thirteen boards need revisions. The most consequential discrepancies are the conflicting retention and scheduling rules on 23 and the retry/reconnection actions on 14. Review these alongside the open findings on 13, 16 and 18 from the initial pass. After edits, inspect the rendered mobile and desktop states together using the same example account, version and expiry time.

The initial review below records the scope and results as of 4 November. Its pending numbered-board content review was completed by the table above. The separate homepage, visual, accessibility and functional checks remain open.

## Verdict

**Needs corrections before implementation handoff.** All 24 numbered screen/state boards exist, but the rendered designs still contain contract conflicts and unrequested features. Earlier Stitch completion summaries are not proof that every requested correction reached the screens.

This is a design/content QA review, not a functional application test. No emails, generation jobs, account connections, deletions or Instagram posts were triggered. No designs were modified during this review.

## Evidence and method

- Inspected the live [Stitch project](https://stitch.withgoogle.com/u/1/projects/16810763223132817674?pli=1) through Chrome, using the rendered canvas accessibility/DOM snapshot.
- Compared visible content with [Application Screen Inventory](Application-Screen-Inventory.md), including its requirements, state transitions and scheduling example.
- Verified canvas titles for boards 01–24. Detailed rendered content was available for 06, 13, 15, 16, 17 and 18 in the inspected view. Other boards are inventory-verified only in this pass; their content is **not** marked passed based on agent summaries.
- The snapshot includes Stitch conversation history. Findings below derive from application iframe content, not claims in that history.
- This pass did not measure pixels, contrast, responsive overflow or animation. Existing overview images are reference artifacts, not evidence of those tests passing.

## Executed checks

| Check | Scope | Outcome | Observed result |
|---|---|---|---|
| Numbered board inventory | 01–24 | Pass | All 24 canvas titles present; 18 desktop and six mobile boards. Boards can contain alternative states and are not separate routes. |
| Idea helper controls | 06 | Partial | Three topic concepts and recovery links present; two suggestions have Use this idea, but first has ambiguous Clear controls. Actual fill-without-submit behavior untested. |
| Scheduled artifact identity | 13 | Pass, content only | Version 1, captions ON, account, posting at 15:00 and expiry at 16:00 shown. |
| Cancellation contract | 13 | Fail | Invented two-minute cancellation cutoff rather than dispatch-state eligibility. |
| Retention explanation | 13 | Fail | Banner applies two-hour retention to scheduled posts as well as media; dispatch-relative retention wording can mislead. |
| Preference state coverage | 15 | Pass, content only | Voice choices, unavailable choice, captions, timezone, save success, failure and conflict represented. |
| Preference scope and copy | 15 | Fail | Debug control and unsupported synthesis/timezone claims visible. |
| Instagram connection states | 16 | Partial | Disconnected, connected, expired and unsuccessful states present; account switching and resume semantics need correction. |
| Account scope | 17 | Fail | API-key management, profile editing, storage quota and engine metadata added without V1 requirement. |
| Destructive confirmation coverage | 17 | Partial | Four confirmations present; published Instagram copy preservation stated. Fresh-sign-in and in-flight caveats need clearer treatment. |
| Expired-media recovery | 18 | Fail | Schedule-expired specimen offers Publish now despite saying media expiry has passed. |
| Topic validation | 18 | Fail | Over-limit specimen incorrectly asks the user to enter a topic. |
| Signed-in navigation consistency | 17–18 | Fail | Sign in appears alongside account/recovery content instead of consistent signed-in navigation. |
| Customer-facing language | 13, 15–18 | Fail | Research/synthesis/protocol language and designer annotations remain inside product surfaces. |

## Findings and acceptance criteria

### QA-01 — High: publishing expired media

**Screen 18, State H.** Text says “media expiry time has passed,” followed by “Please publish now or generate a fresh video” and an enabled-looking Publish now action.

Remove publishing when media has expired. Offer fresh generation from the saved idea. For a changed schedule window with unexpired media, offer Publish now only if server eligibility allows it (including the five-minute remaining requirement). Retest expired, less-than-five-minute, and eligible states separately.

### QA-02 — High: unsupported cancellation cutoff

**Screen 13, dispatching specimen.** “Scheduled posts cannot be cancelled within 2 minutes of publication.”

Cancellation depends on dispatch state, not a fabricated time cutoff. Replace with “Publishing has started, so this post can no longer be cancelled here.” Pending items must remain cancellable when the server permits; dispatched items must not imply guaranteed cancellation.

### QA-03 — High: reconnect and account-switch ambiguity

**Screen 16.** Connected copy says account changes “will retarget new scheduled drafts”; expired copy implies reconnect resumes scheduled publishing, without an explicit Resume action in this specimen.

State that existing schedules keep their selected account and video version. Reconnect the same account, then require explicit resume and recheck eligibility. Never silently retarget a scheduled publication. Retest against screen 14 and mobile 23 for identical language.

### QA-04 — Medium: V1 scope creep

**Screen 17.** Visible controls/data include “Manage API Keys,” “Edit Profile,” “3.8 GB / 25 GB,” “Pilot Tier,” and “Daylight Synthesis Engine v2.4.”

Remove unsupported account controls, storage quotas and engine labels. Keep account identity, sign out and the agreed confirmation flows. Do not let mockup inventions become backend requirements.

### QA-05 — Medium: preference debug UI and unsupported promises

**Screen 15.** “Simulate Network Error” appears as a product control. “Synthesis Integrity Rule” promises voice processing characteristics. Timezone copy claims it recalculates future batch compilations automatically.

Move test-state controls outside the customer layout. Use “Timezone changes how dates and times are displayed.” Avoid implying existing scheduled instants change. Remove unsupported voice-processing claims and invented maintenance reasons; use neutral “This voice is currently unavailable.”

### QA-06 — Medium: incorrect validation message

**Screen 18, State A.** Counter is 2,084 / 2,000, but error says “Please enter a topic before creating a video.”

Separate empty and over-limit states. Over-limit: “Shorten your idea to 2,000 characters or fewer.” Preserve entered text and associate the error with the field. Empty: “Enter an idea to create a video.”

### QA-07 — Medium: misleading retention language

**Screen 13.** Banner says created explainers and scheduled posts are retained for two hours after generation. Card adds “Retained for 1 hour after dispatch.”

Use “Video files are available for two hours after the first version is ready.” Show the fixed expiry timestamp. Remove dispatch-relative retention promises; publishing must not restart or define the retention clock. Metadata and Instagram copies have different lifecycles.

### QA-08 — Medium: account deletion and in-flight handling

**Screen 17.** Account deletion mentions email confirmation but does not clearly show fresh sign-in. Project deletion promises any scheduled posts will be cancelled without qualifying already-dispatched work.

Explicitly require recent sign-in before account deletion. Say pending publications are cancelled, while already-dispatched work may finish. Preserve the existing explanation that local deletion does not delete Instagram posts.

### QA-09 — Medium: ambiguous idea actions

**Screen 06.** First suggestion is accompanied by Clear buttons, unlike the other suggestions' Use this idea actions. Captions are not visible in the inspected composer state.

Give every suggestion a consistent Use this idea action; reserve Clear for clearing the topic. Preserve caption choice when opening/closing the assistant. Verify selection only fills the topic and never starts generation automatically.

### QA-10 — Medium: shell and plain-language consistency

**Screens 15–18, also 13.** Examples include Workspace Configuration, Synthesis Integrity Rule, OAuth Protocol 2.1, Daylight Handshake, Zero data loss policy active, Listening for socket ping, and research-platform footers. Screen 17 has Sign in while displaying the signed-in account; 18 lacks the standard app navigation.

Use the agreed My videos / Create video / Settings shell for authenticated states. Session-expired variants may show sign-in recovery as a distinct state. Keep annotations outside product layouts. Footer: “ChitraBodh · Ideas in motion. Made clear.” Remove fabricated guarantees, metrics, API-version badges and unnecessary footer destinations.

## Coverage remaining — not tested

- Detailed visual/content inspection of 01–05, 07–12, 14 and 19–24; homepage/demo content and scientific diagram accuracy.
- Keyboard order, visible focus, accessible names, modal focus containment and Escape behavior.
- Measured text contrast, 44px interaction targets, 200% zoom, 320/390/768px layouts and horizontal overflow.
- Real prototype navigation, suggestion selection, form validation, disabled controls and state persistence.
- Media playback, audio synchronization, captions, duration, export resolution and actual downloaded file.
- Authentication, single-job concurrency, expiry enforcement, version pinning, server scheduling boundaries, duplicate-publication prevention and reconnection behavior.

Static state specimens establish intended coverage only. A displayed disabled button or success message is not evidence that the corresponding application behavior works.

## Follow-up order

1. Correct QA-01–03 before translating publishing screens into code.
2. Correct QA-04–10 and propagate equivalent fixes to mobile boards.
3. Reinspect actual rendered screens after correction; do not accept Stitch's completion message as validation.
4. Finish the untested visual/accessibility review and then test implemented end-to-end flows against API contracts.

**Handoff status:** design review remains open. The collection is useful for layout direction, but is not yet an approved functional specification.
