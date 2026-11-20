-- Apply once if phone_verifications was already created before the eSMS integration.
ALTER TABLE phone_verifications ADD COLUMN otp_hash VARCHAR(100) NULL;
