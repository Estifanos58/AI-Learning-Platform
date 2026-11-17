ALTER TABLE email_verifications
    ADD COLUMN IF NOT EXISTS verification_code VARCHAR(10);

UPDATE email_verifications
SET verification_code = COALESCE(verification_code, substr(token_hash, 1, 6))
WHERE verification_code IS NULL;

ALTER TABLE email_verifications
    ALTER COLUMN verification_code SET NOT NULL;

ALTER TABLE email_verifications
    DROP COLUMN IF EXISTS token_hash;

CREATE INDEX IF NOT EXISTS idx_email_verification_user
    ON email_verifications(user_id);
