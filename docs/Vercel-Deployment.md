# Vercel pilot deployment

Prepared 25 November 2026. The repository-root `vercel.json` uses the Next.js dashboard service and four Docker-based Vercel Daemons. Import branch `dev` with repository root `./`. Do not select `dashboard` as the project root: workers need the repository build context.

## Staged activation

All daemon instance counts start at zero. Initial deployment verifies the public homepage and build only; sign-in, database health and generation are not verified without runtime secrets. The existing Docker image includes Chromium, FFmpeg, fonts and a single rendering concurrency slot. Cleanup runs its continuous loop, unlike Render's one-shot cron command.

After a healthy deployment, configure Production environment variables from the existing private local configuration: MongoDB URI, Better Auth secret, Gemini API/model/fallback models, ElevenLabs API key and male voice ID, Filebase endpoint/access key/secret/bucket/region, and Instagram app ID/secret/config ID/token encryption key/API version. Preserve the existing Instagram token encryption key. Map local ELEVEN_LABS_API_KEY to ELEVENLABS_API_KEY. Never put these values in Git or public NEXT_PUBLIC variables.

Set CHITRABODH_PUBLIC_URL and BETTER_AUTH_URL to the actual stable project HTTPS origin, and INSTAGRAM_REDIRECT_URI to that origin plus `/api/v1/instagram/callback`. Next.js serverless functions do not run the Docker startup wrapper, so explicit auth/callback variables are required. Set PILOT_SIGNUP_ENABLED=false, AI_PROVIDER=gemini, GEMINI_API=interactions and MONIKA_VOICE_ENABLED=false for the initial pilot.

Redeploy after setting secrets. Verify `/api/health`, sign-in, owner isolation and Filebase range delivery. Drain and stop the known local workers, inspect pending publishing tasks, then enable one instance of each daemon. Check worker leases, storyboard generation, rendering, cancellation, expiry and cleanup. Do not treat queued submissions as a successful generation test. Update Meta's exact allowed callback only after the final origin is healthy. Live publishing still requires an explicitly selected and approved video.

## Plan limits and outstanding validation

Daemons are public beta and run only for production deployments. Current Hobby limits are 5 active CPU-hours and 420 GB-hours provisioned memory per month. The proposed 2+1+1+1 GiB workers consume that memory allocation in approximately 84 hours if continuously enabled; rendering can exhaust CPU first. Pause workers after short pilot sessions, or select a suitable paid plan before always-on operation. Check account plan eligibility before commercial launch. No paid upgrade is authorized by this configuration.

Cloud build, Linux rendering, function bundle limits, MP4 streaming, Atlas access from Vercel and Meta reconnection require live verification. A successful public homepage is not full product sign-off. Existing Render files remain an alternative; no Render resources have been provisioned.

References: [Daemons](https://vercel.com/docs/daemons), [daemon configuration](https://vercel.com/docs/daemons/config-reference), [quotas](https://vercel.com/docs/daemons/limits), [services](https://vercel.com/docs/services/config-reference).
