-- Apply once in environments using managed migrations (MySQL 8).
ALTER TABLE users ADD COLUMN phone_verified_at DATETIME(6) NULL;
CREATE TABLE phone_verifications (
    user_id INT NOT NULL PRIMARY KEY,
    phone VARCHAR(16),
    provider_sid VARCHAR(40),
    otp_hash VARCHAR(100),
    sent_at DATETIME(6),
    expires_at DATETIME(6),
    verified_at DATETIME(6),
    window_start DATETIME(6),
    sends INT NOT NULL DEFAULT 0,
    attempts INT NOT NULL DEFAULT 0
);
