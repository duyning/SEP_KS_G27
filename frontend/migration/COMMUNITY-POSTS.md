# Community posts and moderation

The community form and staff moderation pages now use Spring Boot APIs and MySQL instead of fixtures.

## Flow

1. Sign in and submit a post at `/community` in one of the three existing categories.
2. The server assigns the authenticated account as author and saves `PENDING`. The public feed queries only `APPROVED` posts.
3. The author follows status and feedback under **Bài viết của tôi** (`/community?view=mine`).
4. Staff/admin open `/staff/community`, select a post and approve, reject or request changes.
5. Only the author can edit a post with `NEED_CHANGES`. Resubmission resets it to `PENDING` and requires another review.
6. Decisions persist the reviewer, time, note and audit record. A row lock prevents concurrent decisions. Staff cannot review their own posts.

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

Status codes: `400` invalid fields, `401` not signed in, `403` insufficient permission/self-review, `404` missing or another author's post on resubmission, `409` state conflict/already reviewed. Errors never become sample records or fake success.

## Database and run

Restart the backend after updating. The existing `ddl-auto=update` adds `price`, `location`, `contact_name`, `contact_phone`, `review_note` to `posts` and adds `NEED_CHANGES` to its status enum. Existing post types `PASS_ROOM`, `ROOMMATE`, `PASS_ITEM` are retained and mapped to frontend category names.

No sample posts are inserted. The current creation form has no attachment upload input; this flow covers its existing text, price and contact fields. Likes/comments are outside this flow.

`CommunityTests` covers persistence, validation, authentication, public visibility, ownership, resubmission, audit history and concurrent reviews on H2. `frontend/tests/community.test.js` covers price parsing, field validation and API handling. Existing host/auth tests remain part of Maven `verify`.
