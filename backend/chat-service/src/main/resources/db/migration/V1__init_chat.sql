CREATE TABLE chatrooms (
    id UUID PRIMARY KEY,
    type VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL
);

CREATE TABLE chatroom_members (
    id UUID PRIMARY KEY,
    chatroom_id UUID NOT NULL,
    user_id UUID NOT NULL,
    joined_at TIMESTAMP NOT NULL,
    CONSTRAINT uq_chatroom_member UNIQUE(chatroom_id, user_id)
);

CREATE INDEX idx_chatroom_members_user ON chatroom_members(user_id);
CREATE INDEX idx_chatroom_members_chatroom ON chatroom_members(chatroom_id);

CREATE TABLE messages (
    id UUID PRIMARY KEY,
    chatroom_id UUID NOT NULL,
    sender_user_id UUID NOT NULL,
    ai_model_id VARCHAR(255),
    content TEXT,
    file_id UUID,
    created_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_messages_chatroom ON messages(chatroom_id);
CREATE INDEX idx_messages_sender ON messages(sender_user_id);
