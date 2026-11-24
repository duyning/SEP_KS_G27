-- Managed MySQL schema: apply once. Development uses Hibernate plus HostApplicationSchema.
ALTER TABLE host_applications MODIFY COLUMN target_commune VARCHAR(100) NULL;
ALTER TABLE host_applications MODIFY COLUMN expected_scale VARCHAR(100) NULL;
CREATE TABLE host_application_identity (
 application_id INT NOT NULL PRIMARY KEY,
 content_type VARCHAR(32) NOT NULL,
 content LONGBLOB NOT NULL,
 uploaded_at DATETIME(6),
 CONSTRAINT fk_host_identity_application FOREIGN KEY (application_id) REFERENCES host_applications(id)
);
