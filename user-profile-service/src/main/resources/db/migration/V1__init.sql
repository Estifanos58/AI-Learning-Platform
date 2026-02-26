CREATE TABLE user_profiles (
    user_id UUID PRIMARY KEY,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    university_id VARCHAR(50),
    department VARCHAR(100),
    bio TEXT,
    avatar_url TEXT,
    profile_visibility VARCHAR(20) NOT NULL DEFAULT 'PUBLIC',
    reputation_score INTEGER NOT NULL DEFAULT 0,
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_university ON user_profiles(university_id);
CREATE INDEX idx_department ON user_profiles(department);
