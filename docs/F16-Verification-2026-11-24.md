# F16 verification — 24 November 2026

## Scope

Publish a selected ready video to a connected Instagram professional account, with explicit creator confirmation. This checkpoint implements publishing but does not claim a live Meta publication or browser visual QA.

## Checks and evidence

| Check | Outcome |
| --- | --- |
| Production dashboard compile/type check | Passed; `/publish/[id]` and all four API route families emitted. |
| Existing regression suite | 77 passed; eight optional integration checks skipped in that run. A separate optional HTTP test was added afterward and run explicitly. |
| Real HTTP provider simulation | Validated form encoding, grant/scope and quota rejection, unsafe permalink rejection, and lost media_publish response without automatic retry. |
| Isolated Atlas lifecycle | Same-key concurrent requests returned one job. Different subsequent keys were blocked for the existing artifact/account. Lease takeover rejected a stale save. Interrupted dispatch reconciled rather than publishing again. |
| Disconnect and expiry | Disconnect revoked fetch eligibility and blocked pre-dispatch work. Container confirmation still resolved an unknown result after local media expiry. Five-minute admission boundary was inclusive. |
| Capability media HTTP | GET bytes matched the fixture. HEAD had no body and correct length. Suffix ranges returned 206. Unsatisfiable ranges returned 416 with size. Invalid capability and expired grant were denied. Uses fixture bytes, not live Filebase ingestion. |
| Production-route HTTP on isolated Atlas database | Registered two synthetic creators; owner review/eligibility succeeded, other creator received 404, signed-out API received 401 and page redirected, foreign Origin received 403. Duplicate POST returned existing receipt, history excluded raw caption. |
| Cursor pagination | Returned next page without duplicates; wrong-owner and tampered cursors rejected. |
| Reference design | Inspected exported Stitch board 11 and QA corrections. Implemented paper/forest palette, video review and destination/caption panel, mobile CSS breakpoint, explicit intent and uncertain-result action. Pixel parity and keyboard/mobile browser behavior are not yet verified. |

The first HTTP QA attempt used an overlong Atlas database name; shortened it. Cleanup initially attempted dropDatabase, which this account disallows; changed to dropping only the disposable database's collections and removed the earlier test collections. No database privileges were expanded. No publishing worker ran against those HTTP fixtures and no real Meta publish request was made.

## Reproduce

- `npm test`
- `npm run typecheck`
- `npm run dashboard:build`
- PowerShell: `$env:TEST_PUBLICATIONS_ATLAS='1'; node node_modules/tsx/dist/cli.mjs --test tests/publications.test.mjs`
- After build, PowerShell: `$env:TEST_PUBLICATIONS_HTTP='1'; node node_modules/tsx/dist/cli.mjs --test tests/publications-http.test.mjs`

Opt-in checks require configured Atlas access. They create isolated temporary collections/database namespaces and remove their collections afterward. Provider traffic is a loopback simulation. The HTTP QA dashboard binds 127.0.0.1:3197; it never starts the publishing worker.

## Live sign-off still required

1. Keep the dashboard at a publicly reachable HTTPS origin; the existing Quick Tunnel hostname may have stopped. Re-register callback if the origin changes.
2. Independently confirm F15 account identity and reconnect lifecycle.
3. Start `npm run publishing:worker` with the same database, Instagram key and application origin.
4. Generate a ready video with at least five minutes left. Choose Share to Instagram, confirm exact account/version/description and explicitly approve a test post.
5. Observe Meta processing, actual Filebase-backed retrieval, publication and the resulting Reel/permalink. Verify the Reel in Instagram.
6. Run desktop/mobile keyboard and expiry walkthroughs, including caption preservation while connection Settings opens in another tab.

Publications already dispatched may finish after disconnect. Published and ambiguous artifact/account pairs remain duplicate-blocked. A status check never sends another publish request. Scheduling and intentional reposts are not part of F16.
