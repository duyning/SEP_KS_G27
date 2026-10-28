-- Non-destructive upgrade for existing MySQL databases; do not rerun schema.sql.
-- Also performed once as needed by PostStatusSchemaMigration on backend startup.
ALTER TABLE posts
    MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'PENDING'
    COMMENT 'PENDING, NEED_CHANGES, APPROVED, REJECTED';
