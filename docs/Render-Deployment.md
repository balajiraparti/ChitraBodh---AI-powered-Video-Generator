# Render pilot deployment

Prepared 25 November 2026. Infrastructure is proposed until the Render Blueprint sync is approved. This is the dev testing environment, not a public launch.

## Resources and cost review

Workspace: My Workspace. Region: Oregon. Branch: dev. Manual deployments; no automatic application of later pushes. Existing Render services are not adopted or changed.

| Service | Process | Proposed compute |
|---|---|---|
| Web | Next.js production, port supplied by Render | 0.5 CPU / 512 MB |
| Generation | Serial Remotion/Chromium/FFmpeg worker | 1 CPU / 2 GB, one render thread |
| Storyboard | Gemini planning/edit worker | 0.5 CPU / 512 MB |
| Publishing | Instagram publishing worker | 0.5 CPU / 512 MB |
| Cleanup | One-shot expired Filebase media cleanup every five minutes | 0.5 CPU / 512 MB cron |

At https://render.com/pricing.md rates checked 25 November: web/storyboard/publishing are $7/month each; proposed renderer is $25/month. Continuous compute totals $46/month plus usage-billed cleanup (Render documents a $1/month minimum), bandwidth/build overages, taxes, existing Atlas/Filebase charges and AI usage. The larger renderer is a proposal requiring explicit approval; its workload needs Chromium and encoding, and capacity still requires a live Linux render test. No autoscaling or persistent disk is proposed. Retain existing Atlas/Filebase; cloud scratch files live in /tmp.

## Configuration

Render's secret variables, not committed dotenv files, supply MongoDB, Better Auth, Gemini, ElevenLabs, Filebase and Meta credentials. Map the local ELEVEN_LABS_API_KEY to the canonical deployment ELEVENLABS_API_KEY. Keep INSTAGRAM_TOKEN_KEY unchanged so existing stored tokens remain readable. Preserve selected Gemini model/fallback and male voice from the private configuration. Monika remains disabled pending provider access. NVIDIA is not activated.

The web service exposes RENDER_EXTERNAL_URL through CHITRABODH_PUBLIC_URL to every process. scripts/render-start.mjs derives BETTER_AUTH_URL and INSTAGRAM_REDIRECT_URI from that same HTTPS origin. A custom domain can later replace CHITRABODH_PUBLIC_URL, with the matching Meta callback update. No guessed hostname is committed.

PILOT_SIGNUP_ENABLED=false closes registration in this cloud pilot; existing accounts can sign in. Local registration behavior is unchanged unless that variable is set. AI eligibility still requires the existing verified/admin-approved account setting. Health /api/health checks MongoDB without returning connection details.

## Cutover and validation

1. Review the actual Blueprint sync and compute costs, then approve provisioning.
2. Supply the required private values through Render's supported secret environment settings; never put them in Git or chat.
3. Inspect cloud builds and logs. Confirm Linux dependencies, MongoDB connectivity and /api/health. Authorize only required Render outbound addresses in Atlas if connection is denied; do not open network access globally.
4. Stop only the known local Chitrabodh workers before cloud pickup so local and cloud workers do not compete on the shared pilot queue. Drain existing work first. Reusing the existing database means existing accounts/data are shared, not copied into an isolated database.
5. Open the assigned HTTPS site and test an existing account. Keep its origin consistent across all services and do not rotate token encryption keys during migration.
6. Register the exact live HTTPS /api/v1/instagram/callback in the existing Meta app via Brave, verify Save, then test connection/reconnection. Stable hostname removes Quick Tunnel churn; tokens may still expire or be revoked.
7. Verify one approved live storyboard/narration/render/upload/download, expiry and cleanup. Run an Instagram publication only with a separately confirmed video, account and caption. F17 scheduling is still planned.

Rollback: disable cloud workers before restarting local processes; restore matching local origin/callback if needed. Keep accepted job snapshots and encrypted token keys. Do not delete shared Atlas data or Filebase media as rollback.

## Validation evidence / limitations

Targeted runtime and existing-page tests passed, including matching HTTPS origins, rejecting credential-bearing origins, command allowlisting, public web binding and one-shot cleanup. TypeScript passed. Production build result is recorded in PROJECT_STATUS.md. Docker Desktop's Linux daemon was unavailable locally; actual Linux image startup/render remains a cloud-deployment gate. CLI validation returned 401 from its expired saved login; the connected MCP Blueprint planning operation is the platform validation path.
