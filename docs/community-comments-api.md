# Community comments API

Base path: `/api/community/posts/{postId}/comments`.

| Method | Path | Authentication | Behavior |
| --- | --- | --- | --- |
| GET | `?page=0&size=20` | Public | Read a page of comments on an approved post. |
| POST | Base path | Bearer token | Add a comment as the authenticated account. |
| PUT | `/{commentId}` | Comment author | Replace the comment content. |
| DELETE | `/{commentId}` | Comment author, staff or admin | Delete the comment. |
| GET | `/{commentId}/replies?page=0&size=20` | Public | Read a page of replies in the thread. |
| POST | `/{commentId}/replies` | Bearer token | Reply to the selected comment or reply. |

POST and PUT accept JSON:

```json
{ "content": "Bàn còn không bạn?" }
```

Leading/trailing whitespace is trimmed. Content is required and limited to 2,000 characters.
The server determines the author from the token, never from request data.
Content is plain text; frontend clients must render it as text rather than HTML.

Responses use the existing `ApiResponse` envelope (`success`, `message`, `data`).
POST returns HTTP 201. PUT and DELETE return HTTP 200; DELETE has `data: null`.
A comment response contains `id`, `postId`, `authorId`, `authorName`, `content`, `createdAt`,
`updatedAt`, `parentId`, `replyToId`, `replyToAuthorName` and `replyCount`.
`updatedAt` stays null until content actually changes; saving unchanged text does not mark it edited.
Root comments have null `parentId`. Every reply belongs to one root thread; replying to a reply
retains its actual target in `replyToId` without creating deeply nested display levels.
Account email, phone number and credentials are not included.

GET returns this shape under `data`:

```json
{
  "content": [
    {
      "id": 1,
      "postId": 6,
      "authorId": 10,
      "authorName": "Người bình luận",
      "content": "Bàn còn không bạn?",
      "createdAt": "2026-10-28T14:30:00"
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 1,
  "totalPages": 1,
  "commentCount": 1
}
```

The main GET returns only root comments. `totalElements` and `totalPages` describe the current
collection (roots or replies), while `commentCount` includes every root and reply on the post.
Post responses also expose this combined count as `commentCount`.

Pages start at zero; size is 1–100 (default 20). Comments are ordered oldest first,
then by ID to keep pagination stable for equal timestamps. Pages beyond the end are empty.

- 400: invalid content, IDs or pagination parameters. Content validation errors are under `data.content`.
- 401: anonymous POST/PUT/DELETE.
- 404: missing/unpublished post, missing comment, comment belonging to another post,
  or attempted modification of another user's comment.

The post owner cannot modify another user's comments. Staff/admin can delete but cannot
rewrite another user's content. Pending, rejected and revision-requested posts expose no
comments through these endpoints, including to their owners.

Comment writes lock the post using the same lock as post deletion/moderation.
Deleting a post removes its comments through the existing cleanup transaction.
The existing `comments` table is extended with nullable `parent_comment_id`, `reply_to_comment_id`
and `updated_at` columns plus a thread index. With the project's current `ddl-auto=update`, Hibernate
adds these on backend restart, preserving existing comments as roots. For installations managing
schema manually, run `sql/migrations/20261028_comment_replies.sql` once instead.

Deleting a root removes all its replies. Deleting one reply preserves other replies and clears
references to the deleted reply, so the thread remains readable.

Validation: `CommunityCommentTests` covers the API lifecycle, pagination, authentication,
ownership, moderation deletion, private post visibility, invalid content and post cleanup.
The frontend supports inline editing by the author, replies to roots and replies, pagination,
cancel buttons, edited labels and counts that include replies. The post footer opens the thread.
