-- Upgrade existing installations. Keeps all registrations and their current statuses.
USE hlrcs;
ALTER TABLE property_registrations
    MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'PENDING'
    COMMENT 'PENDING, NEEDS_SUPPLEMENT, APPROVED, REJECTED';
