CREATE TABLE chatrooms (
    id UUID PRIMARY KEY,
    name VARCHAR(255),
    is_group BOOLEAN DEFAULT FALSE,
    avatar_url TEXT,
    created_by_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_chatroom_created_by ON chatrooms(created_by_id);
CREATE INDEX idx_chatroom_created_at ON chatrooms(created_at);

CREATE TABLE chatroom_users (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    chatroom_id UUID NOT NULL,
    role VARCHAR(20) DEFAULT 'MEMBER',
    joined_at TIMESTAMP NOT NULL,
    last_read_at TIMESTAMP NULL,
    is_muted BOOLEAN DEFAULT FALSE,

    UNIQUE(user_id, chatroom_id)
);

CREATE INDEX idx_chatroom_user ON chatroom_users(chatroom_id, user_id);

CREATE TABLE messages (
    id UUID PRIMARY KEY,
    content TEXT,
    image_url TEXT,
    user_id UUID NOT NULL,
    chatroom_id UUID NOT NULL,
    ai_model_id UUID NULL,
    is_edited BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_messages_room_time
ON messages(chatroom_id, created_at, user_id, deleted_at);

CREATE TABLE ai_models (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    provider VARCHAR(100),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL
);
