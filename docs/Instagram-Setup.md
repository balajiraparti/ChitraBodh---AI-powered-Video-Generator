# Instagram connection setup (F15)

The dashboard uses **Instagram API with Unified Login**, for Business and Creator accounts. Connecting does not publish anything. F16 and F17 will add publishing and scheduling.

## Configure the pilot

1. Add the Instagram product in Meta's developer dashboard and create an Instagram Login Compatible configuration with Instagram accounts only and a 60-day system-user token. Use the **Meta App ID and Meta App Secret**.
2. Use an HTTPS application origin for `BETTER_AUTH_URL`. Register the exact callback `https://YOUR-HOST/api/v1/instagram/callback` in Meta. Both origins must match.
3. Set these server-only values in `dashboard/.env.local`: `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET`, `INSTAGRAM_CONFIG_ID`, `INSTAGRAM_REDIRECT_URI`, `INSTAGRAM_API_VERSION` (the supported Graph version selected for your app), and `INSTAGRAM_TOKEN_KEY` (32 random bytes encoded as 64 hex characters). See `dashboard/.env.example`. Keep the encryption key stable and backed up privately; replacing it makes stored credentials unreadable. Never commit credentials.
4. For the internal pilot, add the professional accounts you own/manage to the app as required by Meta's Standard Access setup. External accounts require appropriate Advanced Access/app review. Request `instagram_basic`, `instagram_content_publish` and `instagram_manage_messages` (required by Unified Login; unused by Chitrabodh).
5. Restart the dashboard. Open Settings → Instagram, connect, approve permissions and select exactly one Instagram account and verify the displayed username. Reconnect retains the same account. Disconnect before choosing a different one.

## Guarantees and boundaries

- One current row per owner. `connectionId` stays stable on reconnect and changes after disconnect/fresh authorization. Future publications must pin both connection ID and account ID; never resolve their destination from the owner's current row.
- Ten-minute one-use state is hashed and bound to an authenticated session. Callback requires that session to remain valid. Only the newest authorization attempt may complete. Disconnect and another tab's changes fence delayed callbacks.
- Server-only token exchanges and identity lookup use 15-second timeouts and no automatic retry. Errors never echo provider payloads or tokens.
- AES-256-GCM encrypts tokens, binding them to owner and connection identity. Browser responses contain only safe identity/status fields. Missing permissions or mismatched identity fail closed.
- Disconnect immediately removes the local token. It neither deletes Instagram posts nor revokes the app grant in Instagram; users can remove that grant in Instagram settings. No scheduled publications exist in F15. F16/F17 must add dispatch eligibility, cancellation and explicit resume checks before enabling publishing.
- Expired credentials show “needs reconnection.” Automatic refresh and provider revocation monitoring are outside this slice; publication must recheck live eligibility.
- Six connection starts per account per minute. Mutations require the configured Origin. No tokens are returned to the browser or logged.

## Verification

20 November 2026: local lifecycle/encryption and real-HTTP simulated provider checks passed. Isolated Atlas lifecycle passed; its temporary collection was removed. These establish local handling, not Meta app permissions or a successful real connection. No Instagram credentials were present at implementation start; live connect/disconnect/reconnect remains pending.

Reference: [Meta Unified Login](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-unified-login/get-started). Orbit discovery was unavailable, so the implementation used Meta's official reference. The installed Postman executable is the desktop app; tests use the repository's Node HTTP harness rather than claiming Postman simulation evidence.

## Unified Login setup checkpoint — 21 November 2026

The Meta app belongs to the Chitrabodh portfolio. Its new `Chitrabodh Instagram` configuration has the three approved scopes, Instagram assets only, and 60-day tokens. Meta displays **Instagram Login Compatible**. Set its ID in `INSTAGRAM_CONFIG_ID`. The portfolio currently has no Instagram account; account terms and account login remain pending.

The adapter uses graph.facebook.com and validates app identity, scopes, expiry and applicable account targets through debug_token. It stores the client business ID and configuration ID privately. It rejects zero/multiple accounts and paging rather than silently choosing an account. Non-expiring tokens are not supported. Legacy connections require reauthorization; never reuse their credentials on the new host.

No HTTPS callback, private app secret, live token or real authorization has been verified yet. A temporary Cloudflare Quick Tunnel can provide a test HTTPS origin without a domain. Use the production dashboard, register the exact callback, set the same HTTPS origin for BETTER_AUTH_URL, restart and sign in through HTTPS. The tunnel hostname changes on restart and stops when its process stops. This does not change Filebase storage.

References: [authentication](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-unified-login/authentication), [token validation](https://developers.facebook.com/docs/graph-api/reference/debug_token/).

## Protected HTTPS pilot checkpoint — 22 November 2026

The designated Instagram tester invitation was accepted. The Meta app secret, configuration ID, Graph version and stable token-encryption key are configured in ignored local environment settings. Configuration validation passes without displaying secrets. Meta confirmed that the exact HTTPS callback was saved.

The production dashboard runs on loopback port 3000 behind an email-restricted Cloudflare Quick Tunnel (`--allowed-mail`). Cloudflare Access requires an emailed one-time code before the browser can reach the dashboard. After that, sign in to Chitrabodh and start the connection from Settings so the OAuth callback retains its initiating session. Do not start from Meta's standalone generated login URL.

This tunnel is for browser OAuth testing only. It does not provide an anonymous media URL for Meta ingestion or a publicly accessible webhook receiver. F16/F17 need their own reviewed delivery setup. The hostname is temporary: after restarting the tunnel, update `BETTER_AUTH_URL`, `INSTAGRAM_REDIRECT_URI` and Meta's registered callback together, then restart the dashboard. Keep local addresses, process logs and credentials out of Git.

Live token exchange and connect/disconnect/reconnect are still pending the protected-site login and Meta authorization walkthrough. Tester acceptance and callback registration alone do not establish a connected account. The separate business-portfolio access request was last observed pending.

## Browser login and Meta asset blocker — 22 November 2026

This supersedes the protected-tunnel checkpoint above. The email gate did not retain access reliably in the tested Brave session. With the user's explicit approval, a temporary public Quick Tunnel was used instead. Browser sign-in reached the dashboard and Settings successfully, and Connect Instagram opened Meta authorization. Private routes still required Chitrabodh authentication. Unexpected sign-in HTTP failures now show a service error instead of incorrectly reporting a password mismatch; server diagnostics record only operation and status.

Meta authorization lists only the Chitrabodh portfolio and no selectable Instagram account. Business Settings shows the designated account owned by a different portfolio, with Chitrabodh's access request pending. The current Facebook login cannot see that owning portfolio; the Instagram identity is denied access to Chitrabodh Settings. The user confirmed this is their only Facebook login. This is an unresolved Meta asset-access problem before callback/token exchange, not evidence of a Chitrabodh timeout or an invalid app secret. Tester-role acceptance does not approve the separate portfolio request.

Next: establish access to the owning portfolio or resolve the ownership/access discrepancy with Meta, then approve the appropriate pending request. Do not remove or transfer the Instagram account merely to bypass this check. Once the account is selectable, restart the test tunnel if stopped, align the app origin and registered callback, and begin a fresh connection from Settings. Old OAuth states expire after ten minutes. Live token exchange, connect/disconnect/reconnect remain unverified; F16/F17 remain planned.
