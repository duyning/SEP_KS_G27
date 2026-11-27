-- Apply once to an existing registration_otps table when Hibernate schema update is disabled.
-- Nullable: email challenges and existing verification proofs do not require a provider reference.
ALTER TABLE registration_otps ADD COLUMN provider_reference VARCHAR(160) NULL;
