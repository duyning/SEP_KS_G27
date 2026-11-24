# DuongND integration checkpoint — 2026-11-25

- Pre-merge commit: f79f05d (pushed to origin/DuongND before integration).
- Local backup branch: backup/DuongND-before-final-merge-20261125.
- Source branch: origin/integration/final-merge, commit 8b99a48.
- Isolated review branch: integration/duongnd-final-merge-20261125.

Resolution: retain the combined Community category/search controls and removal of
/community/reports; keep incoming NestHub branding and other integrated routes.
Keep all existing post/moderation/comment/report/notification/AI behavior, including
AUTO backlog processing. Adapt the realtime test to the new JWT session contract.
Limit the home spacing reset so it cannot override Community cards/comments, and
load the report page's shared card/admin styles explicitly for direct lazy routes.

Validation: full backend suite 1854 tests, 0 failures/errors, 1 skipped; full frontend
suite 384/384; 29 focused Community frontend tests; production frontend build.
Runtime check used isolated H2 on port 8082 and a temporary frontend on port 5174:
member sign-in, post submission/approval, comment and notification persistence,
public realtime update, create-post form, admin report detail and decision dialog.
Live MySQL data and external AI providers were not used for verification.

Local database credentials and Postman workspace files stay outside this commit.
The original properties file and working-tree patch are saved under ignored
logs/pre-final-merge-20261125 in the original checkout. The backup branch keeps a
reviewable code checkpoint; use a separate worktree at that branch to inspect the
pre-merge version without resetting or deleting ongoing work.