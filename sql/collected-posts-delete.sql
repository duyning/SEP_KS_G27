-- One-time upgrade only for databases which already have collected_posts
-- and do not use Hibernate ddl-auto=update. New installs use collected-posts.sql.
ALTER TABLE collected_posts ADD COLUMN deleted BOOLEAN NOT NULL DEFAULT FALSE;
