CREATE TABLE IF NOT EXISTS outbox_events (
    id UUID PRIMARY KEY,
    topic VARCHAR(255) NOT NULL,
    event_key VARCHAR(255) NOT NULL,
    payload TEXT NOT NULL,
    headers_json TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    retry_count INTEGER NOT NULL DEFAULT 0,
    next_attempt_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP,
    last_error TEXT
);

CREATE INDEX IF NOT EXISTS ix_chat_outbox_pending
    ON outbox_events (status, next_attempt_at, created_at);
