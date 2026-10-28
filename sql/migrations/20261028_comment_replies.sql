-- For installations not using Hibernate ddl-auto=update. Run once.
-- Existing comments remain root comments and keep their original content/timestamps.
ALTER TABLE comments
    ADD COLUMN updated_at DATETIME NULL,
    ADD COLUMN parent_comment_id INT NULL,
    ADD COLUMN reply_to_comment_id INT NULL,
    ADD INDEX idx_comment_thread (post_id, parent_comment_id, created_at, comment_id);
