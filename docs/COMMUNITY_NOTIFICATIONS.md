# Community notifications

User and Room Host accounts receive persistent, in-app Community notifications.
Staff and Admin continue to work through their existing moderation queues.

| Event | Recipient |
| --- | --- |
| APPROVED, NEED_CHANGES, REJECTED | Post author, from manual review or an automatic decision |
| HIDDEN | Post author, once when Admin hides a reported post |
| COMMENT | Post author when another member comments or replies |
| REPLY | Author of the specific comment being replied to |

Self interactions do not notify the actor. A reply to the post author's comment
creates one REPLY notification for that author, rather than another COMMENT.
Reporters receive only the existing report-submission confirmation.

## Persistence and access

`community_notifications` is mapped by `CommunityNotification`. Its recipient
is a User foreign key. Post/comment IDs and title/reason/actor snapshots remain
after the post or comment is deleted. The destination endpoint checks current
visibility before returning a link; retained snapshots do not grant post access.

The synchronous `CommunityNotificationEvent` listener requires the originating
transaction. Notifications roll back with the review/comment/report decision.
The unique recipient/event key prevents duplicate notices for the same event.
Review event keys include the post revision so resubmitted posts can notify again.

Authenticated active accounts can access only their own inbox, unread count,
read state and destinations. A notification owned by another account returns 404.

## API and UI

Base path: `/api/community/notifications`.

- GET `?page=0&unread=false`: newest first, 20 per page, `hasNext` and unread count.
- GET `/unread-count`: number of unread items for the authenticated user.
- PUT `/{id}/read` and `/read-all`: idempotent read operations.
- DELETE `/read`: deletes only the authenticated user's read notifications; unread items are retained. The UI asks for confirmation first.
- GET `/{id}/destination`: current post or comment destination, or an unavailable error.

The bell shows an unread badge and a popover with All/Unread filters, individual
read actions and a three-dot menu for Read all and Delete read notifications. `/notifications?tab=community` provides the full inbox;
the existing viewing inbox is retained under `tab=viewings`. Unread badges and
open inboxes refresh from the shared Community SSE stream, as well as focus/read
actions. See [Community realtime](COMMUNITY_REALTIME.md). There are no browser
push, email or SMS notifications.

Notification destinations scroll directly to the existing post card in Community,
without opening a post modal. If the post is outside the loaded feed it is fetched
with the same visibility checks and inserted once in the feed. Comment destinations
identify the root page and target comment, expand the card's comment thread,
highlight the target and move keyboard focus to it. Revision notifications retain
the author's inline edit action.

## Verification

`CommunityNotificationTests` covers ownership, unauthenticated access, read-all,
self/duplicate reply suppression, rollback, duplicate events, unavailable targets,
revision outcomes, inbox pagination and unread filtering. It also exercises Admin
hiding a post with multiple reports and verifies a single author notification and
no reporter result notification. All tests use isolated H2 data.
