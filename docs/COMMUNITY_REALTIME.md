# Community realtime

Community now uses one server-sent event stream per browser tab through
`GET /api/community/events`. The frontend uses streaming fetch so JWTs stay in the
Authorization header, not URL query strings. Guests can connect to public events.

## Coverage

| Signal | Audience | Refresh |
| --- | --- | --- |
| posts: submitted/resubmitted | Owner, Staff, Admin | My posts and moderation queue/detail |
| posts: approved/hidden/deleted public post | Public viewers plus owner/reviewers | Filtered feed, counts, shared target and moderation/report detail |
| posts: scan running/finished or mode changed | Owner/reviewers as appropriate | AI state and decisions |
| comments: create/reply/edit/delete | Public viewers | Comment count and currently expanded root/reply lists |
| notifications: new/read/read-all/delete-read | Recipient only | Bell count and open inbox, including other tabs |
| reports: submitted/resolved or target deleted | Admin only | Grouped queue, counts and current report detail |
| my-reports: submitted | Reporter only | Submission receipts; no result disclosure |

Events carry only type and optional post ID. Full content and visibility remain
governed by the existing REST APIs. Pending-post events and report events are not
broadcast to unrelated accounts or anonymous clients.

## Transactions and connections

Domain services publish invalidations inside their existing transaction. The SSE
hub uses Spring's transaction-bound event listener after commit, so rolled-back
changes never reach clients. Notification persistence retains its original
synchronous transaction semantics. See [Spring transaction-bound events](https://docs.spring.io/spring-framework/reference/data-access/transaction/event.html).

The hub sends heartbeat frames every 15 seconds using its own scheduler so a slow
AI scan cannot starve heartbeats. Connections rotate after about one minute and
resync after reconnect; they are not a durable event log. JWT validity and current
ACTIVE account/role are checked before private events are sent. Bounded sender
queues isolate event writing from mutation transactions. Long-lived requests close
before graceful server shutdown.

The client reconnects with backoff after failure, resets on login/logout, and
resyncs on returning to a visible tab or coming online. A watchdog reconnects if
heartbeats stop. REST snapshots reconcile missed invalidations on reconnect.

## UI state

Background refresh preserves component keys, form drafts, expanded comment
threads and report-decision input while the target still exists. Feed refresh
rebuilds the loaded cursor window and anchors the visible card to reduce scroll
jumps. Cached Back navigation refreshes in the background. A hidden/deleted target
is removed or becomes unavailable according to the normal access rules.

No business locking was replaced. Concurrent staff/AI decisions and reports
still use their existing database locks and revision/conflict checks.

## Deployment

The event hub is in-memory and intended for the project's current single backend
instance. Multiple independent backend replicas need a shared event broker
(for example Redis pub/sub) to distribute invalidations between instances.
Reverse proxies must allow streaming and disable SSE buffering; the endpoint sets
`X-Accel-Buffering: no` and `Cache-Control: no-store`. SSE clients reconnect after
backend restart. No extra paid provider or JavaScript dependency is required.

## Verification

`CommunityRealtimeTests` uses a real HTTP server and streaming clients to verify
post/comment events, private recipient/reviewer audiences, anonymous access,
invalid authentication, rollback suppression and reconnect resync. The frontend
SSE parser tests cover partial UTF-8, CRLF, multiple and malformed frames.
