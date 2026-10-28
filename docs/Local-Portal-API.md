# Local creator portal contract

The portal runs on localhost only. API credentials stay in the server process.

- `GET /`: idea form, two approved voice choices, caption toggle, temporary video gallery. Includes a per-process request token.
- `POST /api/generate`: JSON `{ "topic": "Water cycle", "voice": "bajNon13EdhNMndG3z05", "captions": true }`. Requires matching Origin and X-ChitraBodh-Token headers. Topic must be 1–1,000 characters and voice must be one of the two configured IDs. Returns 202 on acceptance, 400 for invalid input, 403 for missing origin/token, 409 while a portal generation is active, or 413 for a body over 8 KB.
- `GET /api/generation`: `{ "busy": true, "state": "Planning scenes" }`, followed by ready or failed. Failure includes a safe user-facing error. Status is process-local and describes the latest portal request, not CLI jobs.
- Existing media routes continue to enforce the two-hour expiry and support byte ranges.

The pipeline's exclusive lock also protects against simultaneous CLI generation. This local-only token is CSRF protection, not team authentication. Authentication and deployed job persistence remain future work.
