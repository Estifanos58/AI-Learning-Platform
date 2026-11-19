ALTER TABLE users ALTER COLUMN email_verified SET DEFAULT TRUE;
UPDATE users SET email_verified = TRUE WHERE email_verified IS DISTINCT FROM TRUE;
