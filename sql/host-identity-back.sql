-- Use once in environments managed by migrations. Local development uses Hibernate update.
ALTER TABLE host_application_identity ADD COLUMN back_content_type VARCHAR(32) NULL, ADD COLUMN back_content LONGBLOB NULL;
