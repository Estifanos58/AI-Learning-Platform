CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE folders (
    id UUID PRIMARY KEY,
    owner_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    parent_id UUID NULL,
    deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_folders_owner ON folders(owner_id);
CREATE INDEX idx_folders_parent ON folders(parent_id);
CREATE UNIQUE INDEX uq_folders_active_name_per_owner_root
    ON folders(owner_id, lower(name))
    WHERE parent_id IS NULL AND deleted = FALSE;

CREATE TABLE folder_shares (
    id UUID PRIMARY KEY,
    folder_id UUID NOT NULL,
    shared_with_user_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL,
    UNIQUE(folder_id, shared_with_user_id)
);

CREATE INDEX idx_folder_shared_user ON folder_shares(shared_with_user_id);

ALTER TABLE files
    ADD COLUMN folder_id UUID;

INSERT INTO folders (id, owner_id, name, parent_id, deleted, created_at, updated_at)
SELECT gen_random_uuid(), owner_id, 'Migrated', NULL, FALSE, NOW(), NOW()
FROM (
    SELECT DISTINCT owner_id
    FROM files
) owners
WHERE NOT EXISTS (
    SELECT 1
    FROM folders f
    WHERE f.owner_id = owners.owner_id
      AND f.parent_id IS NULL
      AND lower(f.name) = lower('Migrated')
      AND f.deleted = FALSE
);

UPDATE files f
SET folder_id = selected_folder.id
FROM (
    SELECT DISTINCT ON (owner_id) owner_id, id
    FROM folders
    WHERE parent_id IS NULL
      AND lower(name) = lower('Migrated')
      AND deleted = FALSE
    ORDER BY owner_id, created_at ASC
) selected_folder
WHERE f.owner_id = selected_folder.owner_id
  AND f.folder_id IS NULL;

ALTER TABLE files
    ALTER COLUMN folder_id SET NOT NULL;

CREATE INDEX idx_files_folder ON files(folder_id);
