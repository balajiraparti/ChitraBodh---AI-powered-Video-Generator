# Instagram connection setup (F15)

The dashboard uses **Instagram API with Instagram Login**, for Business and Creator accounts. Connecting does not publish anything. F16 and F17 will add publishing and scheduling.

## Configure the pilot

1. Add the Instagram product in Meta's developer dashboard and configure Instagram business login. Use the **Instagram App ID and Instagram App Secret**.
2. Use an HTTPS application origin for `BETTER_AUTH_URL`. Register the exact callback `https://YOUR-HOST/api/v1/instagram/callback` in Meta. Both origins must match.
3. Set these server-only values in `dashboard/.env.local`: `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET`, `INSTAGRAM_REDIRECT_URI`, `INSTAGRAM_API_VERSION` (the supported Graph version selected for your app), and `INSTAGRAM_TOKEN_KEY` (32 random bytes encoded as 64 hex characters). See `dashboard/.env.example`. Keep the encryption key stable and backed up privately; replacing it makes stored credentials unreadable. Never commit credentials.
4. For the internal pilot, add the professional accounts you own/manage to the app as required by Meta's Standard Access setup. External accounts require appropriate Advanced Access/app review. Request `instagram_business_basic` and `instagram_business_content_publish`.
5. Restart the dashboard. Open Settings → Instagram, connect, approve permissions and verify the displayed username. Reconnect retains the same account. Disconnect before choosing a different one.

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

Reference: [Meta Business Login for Instagram](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/business-login). Orbit discovery was unavailable, so the implementation used Meta's official reference. The installed Postman executable is the desktop app; tests use the repository's Node HTTP harness rather than claiming Postman simulation evidence.
