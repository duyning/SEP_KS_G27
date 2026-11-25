# Shared direct messaging — 2026-11-25

Messaging is shared across NestHub. Any ACTIVE signed-in account can converse with
another ACTIVE account. Community is the first entry point; no STAFF/ADMIN bypass
exists for reading private messages. Future domains integrate by calling the same
conversation API and registering a `MessagingContextResolver` for their references.

## Data and access

- `DirectConversation` → `messaging_conversations`: ordered low/high User foreign
  keys, unique pair, last per-conversation sequence, separate monotonic read cursors,
  created/updated timestamps. Opening from either direction returns the same thread.
- `DirectMessage` → `messaging_messages`: conversation and sender User foreign keys,
  sequence, UUID client message ID, text (up to 2000 trimmed UTF-16 characters;
  nonempty unless attachments are present), optional
  context kind/reference ID and creation timestamp. Unique constraints enforce
  conversation/sequence and conversation/sender/client-key uniqueness.
- Canonical-member locking serializes first creation. Conversation locking serializes
  sends and read updates. Retry lookups use current locking reads for MySQL's repeatable
  read isolation. A repeated key returns the original message; changed payload returns
  409. A send never silently marks incoming messages as read.
- All IDs, sender identity and membership are checked server-side. Outsiders receive
  404 on thread APIs, including Admin/Staff. Disabled users cannot use the endpoints;
  existing history remains readable to the other active member, but new sends stop.
- Context URLs/titles are derived by the server, never trusted from the client.
  Community references require an APPROVED post authored by one of the participants.
  Hidden/pending references are shown only to their author; other viewers get an
  unavailable card without title/link. Deleting a post does not delete the chat.

## API

All routes below require an authenticated active account. Base `/api/messaging`.

| Method / route | Body / query | Result |
| --- | --- | --- |
| GET `/conversations` | `page=0&q=` | 20 peer-name-filtered threads, hasMore, global unread message count |
| POST `/conversations` | `{recipientId, context?: {kind,referenceId}}` | Canonical thread and validated draft reference |
| GET `/conversations/{id}/messages` | optional `before` sequence | 50 messages ascending, hasMore and member/read summary |
| POST `/conversations/{id}/messages` | `{clientMessageId,content,context?}` | Persisted message, idempotent on client key |
| PUT `/conversations/{id}/read` | `{through}` | Monotonic own read cursor, never above last persisted sequence |

Initial context kind: `COMMUNITY_POST`. Message text is plain text, not HTML.
Group chats, typing/online claims and calling are not included.

## Replies and private media (2026-11-25)

`DirectMessage.replyTo` is an optional self FK. The server requires the referenced
message to be in the same conversation, and returns a shallow quote (sender,
sequence and up to 180 characters), without recursively serializing reply chains.
JSON sends accept optional `replyToId`; existing text-only requests still work.

`DirectMessageAttachment` → `messaging_attachments` stores message FK, IMAGE/VIDEO,
sanitized name, MIME, byte size, SHA-256 digest and LONGBLOB content. History/inbox
reads use metadata projections, not BLOBs. `POST .../messages` also accepts multipart
`details` (application/json Send payload) and `files`. Limits: 6 JPG/JPEG/PNG images,
5 MB/image, 20 megapixels; one MP4 H.264/AVC video, AAC audio or none, 50 MB,
180 seconds, Full HD; 80 MB combined. Existing Community validators are reused.
At least text or an attachment is required. Invalid files roll back the whole send.
Idempotent retries compare text/context/reply plus ordered file digests/names/types.

`GET /api/messaging/conversations/{id}/attachments/{attachmentId}` checks active
membership, including for Admin, and the file's conversation. It serves private,
no-store/nosniff content with Range support. Browser fetches use JWT headers and
revocable blob URLs; no public file URLs or credentials in query strings. Video
content loads on click; image requests are deferred until visible.

The floating chat has one name header and grows with history up to a viewport cap;
only longer history scrolls. The input grows to 120px and scrolls beyond that.
Replies, selected files and text remain in memory across minimize/close/full-page,
and clear on session changes. Successful sends clear only the draft that was sent.
The selected-file preview can be removed; quotes can be cancelled before sending.
Text counts/instruction footer are removed. Full-page chat retains its name/back
navigation, while the repeated name/privacy header in the floating chat is removed.

Media verification: 18 backend tests passed (including Community video regression),
397 frontend tests passed, and production build passed. Actual HTTP multipart on
isolated H2 returned 200, replying to that video returned its original message ID,
and authenticated video Range returned 206 with exactly 16 requested bytes.
The browser integration was unavailable, so layout/device/file-picker interaction
has not been visually verified for this update.

## Realtime and UI

`MessagingChanged` is a domain event. The existing authenticated SSE transport
(`/api/community/events`) delivers only `{type:"messages",conversationId}` to the
two participants AFTER COMMIT. It rechecks ACTIVE role/session before writing;
guests and unrelated users (including Admin) do not receive these invalidations.
No message content or credentials are included in event URLs/payloads.

The application uses a single existing SSE connection per tab. Reconnect, focus and
online resync reload authoritative REST history/counts. Clients deduplicate by
sequence; if a long disconnect leaves a gap they reload a contiguous latest window,
with older messages still available through the cursor API. This transport is for
one backend instance; multiple instances require a shared event bus before scaling.

Connections rotate after five minutes (previously 60 seconds), with a 15-second
heartbeat that still checks account status, role and the current JWT session.
Reconnect resync is a background refresh: Community preserves rendered posts and
scroll position, retries transient feed-read failures twice (500/1500ms), and only
shows a refresh error if attempts fail. Access failures are never retried. Chat
lists/comments/notifications also retain their last confirmed data while refreshing.

Navbar entry and `/messages` work across roles. Community has a Message button for
other authors' public posts; guests are directed to login. Desktop opens one floating
thread with minimize/close/full-page actions. At <=700px it opens the full messages
page, with conversation-back navigation. Drafts and pending idempotency keys remain
in memory across minimize/close/full-page navigation and clear on account/session
change; no message drafts are persisted to browser storage.

Incoming messages auto-scroll only near the end. Reading older messages keeps the
position and displays a new-message button. Read acknowledgement requires the open
thread near its end and an active visible document. Read receipts use the peer's
server cursor; the UI does not claim delivery/online status.

Tests: `MessagingTests` (canonical pair, ownership, unread/read cursors, retries,
context privacy, limits, disabled accounts, pagination and concurrency),
`MessagingRealtimePrivacyTest` (actual SSE audience/session filtering), and
`frontend/tests/messaging.test.js` (merge/reconnect and API payload contracts).

Hibernate creates the messaging tables and nullable reply FK under the existing local `ddl-auto=update` setup.
No existing community data is migrated or deleted. Restart the backend after upgrade.

## Verification performed

- H2 backend: 16 tests passed across messaging, private SSE delivery, community
  realtime and comments; frontend: all 387 tests passed; production build passed.
- Two separate browser sessions exchanged messages from a Community post to a host
  portal without reloading. Unread badge, reference card, read receipt, full-page
  history, Enter/Tab keyboard use and unavailable-conversation error were checked.
- Desktop browser was checked at its actual 1280px viewport. The browser resize
  capability did not change that viewport, so 375/768/1024/1440px and 200% zoom
  remain unverified. Responsive rules are implemented, but physical mobile keyboard
  behavior still needs a device check.
- Preview data used an isolated H2 database with AI disabled; the user's MySQL data
  and connection credentials were not changed by this feature.

Realtime refresh fix verification (2026-11-25): 392 frontend tests, production
build and 5 backend tests passed. An actual HTTP SSE stream remained open for
66 seconds, emitted no age-related resync, and then delivered a committed public
event. Clock-based tests separately cover revoked accounts, private audiences and
the five-minute connection cap. The current Edge refresh cycle was not rechecked
because browser access was unavailable; restart Local to replace the old JVM.
