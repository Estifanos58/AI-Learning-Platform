CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(100) UNIQUE,

    password_hash TEXT NOT NULL,

    role VARCHAR(30) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',

    email_verified BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP NULL,

    CONSTRAINT chk_role
      CHECK (role IN ('STUDENT','INSTRUCTOR','ADMIN')),

    CONSTRAINT chk_status
      CHECK (status IN ('ACTIVE','SUSPENDED','LOCKED','DELETED'))
);

CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    token_hash TEXT NOT NULL,

    issued_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,

    revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMP NULL,

    replaced_by UUID NULL,

    ip_address VARCHAR(100),
    user_agent TEXT
);

CREATE INDEX idx_refresh_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_exp ON refresh_tokens(expires_at);

CREATE TABLE email_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,

    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE password_resets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,

    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT NOW()
);
