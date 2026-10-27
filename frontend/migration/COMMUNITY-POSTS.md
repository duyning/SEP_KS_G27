# Community posts and moderation

The community form and staff moderation pages now use Spring Boot APIs and MySQL instead of fixtures.

## Flow

1. Sign in and submit a post at `/community` in one of the three existing categories.
2. The server assigns the authenticated account as author and saves `PENDING`. The public feed queries only `APPROVED` posts.
3. The author follows status and feedback under **Bài viết của tôi** (`/community?view=mine`).
4. Staff/admin open `/staff/community`, select a post and approve, reject or request changes.
5. Only the author can edit a post with `NEED_CHANGES`. The author sees the staff instruction in a blue panel in **Bài viết của tôi** and inside the prefilled editing form. Submission requires an actual content/contact/price/category or attachment change, checked on both client and server. Resubmission resets it to `PENDING`, clears the current review fields, preserves the moderation history and retained media, and requires another staff review before publication. Staff cannot approve while the post is still waiting for author changes.
6. Decisions persist the reviewer, time, note and audit record. A row lock prevents concurrent decisions. Staff cannot review their own posts.
7. In **Bài viết của tôi**, authors can delete their own posts in every status after confirming. Deleted posts disappear from public, author and moderation lists; related comments, media and category details are removed, while moderation audit records are retained. The author feed no longer displays the yellow moderation feedback banner; a separate blue instruction panel appears only for posts requiring changes.

## Validation

Rules are enforced on both client and server, with errors displayed under the relevant inputs.

| Field | Rule |
| --- | --- |
| Category | `ROOM_TRANSFER`, `ROOMMATE` or `SECOND_HAND` |
| Title | Required, 10–200 characters after trimming |
| Content | Required, 30–5000 characters after trimming |
| Price | Optional (`null` means negotiable); integer VND, at most 1,000,000,000. Rent/share price must be positive if supplied; second-hand items may be free (0). |
| Location | Required, 5–255 characters after trimming |
| Contact name | Required, 2–100 characters after trimming |
| Contact phone | Vietnam mobile number with domestic `0` or international `+84`; spaces, dots and hyphens are normalized |
| Review reason | Required for rejection/change requests, 10–2000 characters. Approval note is optional, at most 2000. |
| Images | Optional; at most 6 existing + new images, at most 5 MiB each; JPG/JPEG (`.jpg`, `.jpeg`, `image/jpeg`) or PNG (`.png`, `image/png`). At most 20,000,000 pixels, each dimension at most 10,000 px. |
| Video | Optional; at most 1 retained + new video, at most 50 MiB. MP4 (`.mp4`, `video/mp4`) with H.264/AVC video and optional AAC audio. Duration > 0 and at most 180 seconds; max dimension 1920 px and max 1920×1080 pixels (portrait supported). |

The form has separate image and video pickers with previews and removal controls. Image uploads reject WEBP, GIF, HEIC/HEIF, SVG, BMP, PDF and videos. The video picker rejects MOV, AVI, MKV, WEBM and non-MP4 files. Both reject empty/corrupt or falsely renamed files and identify the offending file. Client image checks include filename, MIME, signature and browser decoding; the server independently checks ImageIO decoding and dimensions. Client video checks include filename/MIME, MP4 header, browser decoding, duration and dimensions. The backend uses JCodec 0.2.5 to inspect MP4 structure, verify H.264 video and AAC audio, inspect duration/dimensions, read video samples (max 21,600) and decode a frame. Unsupported HEVC/H.265 videos must be exported as MP4 H.264/AVC. Rejected selections leave previous attachments intact. Closing a draft with media additions/removals asks before discarding it.

The price input accepts `2200000` or `2.200.000`. Decimals, scientific notation and partially numeric input are rejected. API requests send the numeric amount without formatting.

Ordinary keyboard input groups thousands while typing. For Windows Telex/IME composition, the input buffer stays unchanged during the focused editing session; a live formatted amount appears below the field. Grouping is applied inside the field after blur and completion of active composition, avoiding IME buffer corruption and stuck deletion. `scripts/check-community-price.cjs` exercises both installed Microsoft Edge and Google Chrome, including native browser IME composition/commit, clicking away during active composition, replacing a price and clearing zero, without submitting a post. Set `BROWSER_CHANNEL=msedge` or `BROWSER_CHANNEL=chrome` to check only one browser.

Contact name is separate from the account author; staff also see the account name. Clients cannot assign authors, reviewers or approval status.

## API

Responses use the existing `ApiResponse` envelope. All calls except the public feed require a Bearer JWT.

| Method | Path | Access |
| --- | --- | --- |
| GET | `/api/community/posts` | Public; approved only |
| GET | `/api/community/posts/mine` | Current author's posts, all statuses |
| POST | `/api/community/posts` | Signed-in account; creates pending post |
| PUT | `/api/community/posts/{id}` | Author, only `NEED_CHANGES`; resubmits as pending |
| DELETE | `/api/community/posts/{id}` | Author, any review status; permanently deletes the post |
| GET | `/api/community/posts/{id}/images/{imageId}` | Public only for approved posts; otherwise author/staff/admin. Returns image bytes, `private, no-store`, `nosniff`. |
| GET | `/api/community/posts/{id}/videos/{videoId}` | Same visibility as images. Returns `video/mp4` with HTTP Range support, `private, no-store`, `nosniff`. |
| GET | `/api/staff/community/posts` | Staff/admin |
| GET | `/api/staff/community/posts/{id}` | Staff/admin; post, account name, review history |
| POST | `/api/staff/community/posts/{id}/review` | Staff/admin; pending posts only |

Submission:

```json
{
  "type": "ROOM_TRANSFER",
  "title": "Nhượng phòng gần trường Đại học FPT",
  "content": "Phòng khép kín có ban công và chỗ để xe, liên hệ để trao đổi thông tin cụ thể.",
  "price": 2200000,
  "location": "Thôn 2, Tân Xã, Hòa Lạc",
  "authorName": "Nguyễn Văn An",
  "authorPhone": "0912345678"
}
```

Review: `{"decision":"APPROVE","note":""}`. Other decisions are `REJECT` and `REQUEST_CHANGES`.

Creation and resubmission also accept `multipart/form-data`: `details` is an `application/json` part with the same post fields; repeated `photos` parts contain images and `videos` contains the video. JSON submissions without new files remain supported. Optional `retainedImageIds` and `retainedVideoIds` list media to keep on resubmission; omitting either preserves existing media of that type, `[]` removes all of that type. IDs must belong to the post and matching media type and cannot repeat. Responses contain `images: [{id, fileName}]` and `videos: [{id, fileName}]`. Both are fetched through the authenticated media client; video previews use a revocable local Blob URL and native playback controls. Staff can inspect media before approval. Content and all media changes commit atomically; failed validation cannot leave a partial post or lose existing media.

Status codes: `400` invalid fields, `401` not signed in, `403` insufficient permission/self-review, `404` missing or another author's post on resubmission, `409` state conflict/already reviewed. Errors never become sample records or fake success.

## Database and run

Restart the backend after updating. The existing `ddl-auto=update` adds `price`, `location`, `contact_name`, `contact_phone`, `review_note` to `posts` and nullable `file_name`, `content_type`, `file_content` columns to `post_media` for uploaded image storage. `PostStatus` is explicitly mapped to `VARCHAR(50)` so Hibernate does not recreate a native MySQL ENUM. `PostStatusSchemaMigration` runs before data initialization and converts a legacy MySQL/MariaDB ENUM or undersized status column to `VARCHAR(50)` without changing post values. It skips compliant schemas and non-MySQL databases. The standalone equivalent is `sql/migrations/20261028_expand_post_status.sql`; do not rerun the destructive bootstrap `schema.sql` on an existing database. Hibernate `ddl-auto=update` alone does not reliably expand an existing MySQL ENUM; the old three-value ENUM caused `Data truncated for column 'status'` on `REQUEST_CHANGES`. Existing post types `PASS_ROOM`, `ROOMMATE`, `PASS_ITEM` are retained and mapped to frontend category names.

No sample posts are inserted. Images and videos use the same `post_media` blob storage and are removed when the post is deleted; no external upload service or FFmpeg installation is required. Multipart maximum file size is 50 MB and total request limit remains 85 MB (up to 80 MB of accepted media plus multipart/JSON overhead). Per-image 5 MB checks and other upload flows' own limits still apply. Restart the backend to load the new dependency and multipart configuration. Likes/comments are outside this flow.

`CommunityTests` covers persistence, validation, authentication, public visibility, ownership, resubmission, audit history and concurrent reviews on H2. `CommunityDeletionTests` covers deletion in all review states, ownership, authentication, visibility and related-row cleanup on an isolated H2 database. `CommunityImageTests` covers actual JPG/PNG decoding, spoofed/corrupt/oversized files, image permissions, counts, retained IDs and atomic resubmission/deletion. `CommunityVideoTests` creates real H.264 MP4 clips and covers persistence, visibility, Range responses, invalid/corrupt/oversized/long/wide files, counts, ownership, replacement, removal and rollback. Frontend community tests cover media signatures/limits, multipart submissions, draft changes and deletion errors. Existing host/auth tests remain part of Maven `verify`.
