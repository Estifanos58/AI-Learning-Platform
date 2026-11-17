CREATE TABLE files (
    id UUID PRIMARY KEY,
    owner_id UUID NOT NULL,
    file_type VARCHAR(20) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    stored_name VARCHAR(255) NOT NULL,
    content_type VARCHAR(100),
    file_size BIGINT NOT NULL,
    storage_path TEXT NOT NULL,
    is_shareable BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_files_owner ON files(owner_id);
CREATE INDEX idx_files_type ON files(file_type);

CREATE TABLE file_shares (
    id UUID PRIMARY KEY,
    file_id UUID NOT NULL,
    shared_with_user_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL,
    UNIQUE(file_id, shared_with_user_id)
);

CREATE INDEX idx_shared_user ON file_shares(shared_with_user_id);
