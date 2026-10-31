-- Apply once to existing databases managed without Hibernate ddl-auto=update.
ALTER TABLE posts ADD COLUMN facebook_url VARCHAR(500) NULL;
ALTER TABLE posts ADD COLUMN zalo_url VARCHAR(500) NULL;
