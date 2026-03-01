package com.aiplatform.gateway.util.mapper;

import com.aiplatform.gateway.dto.ChatMessageResponse;
import com.aiplatform.gateway.dto.ChatroomResponse;

public final class ChatResponseMapper {

    private ChatResponseMapper() {
    }

    public static ChatroomResponse toDto(com.aiplatform.chat.proto.ChatroomResponse response) {
        return new ChatroomResponse(
                response.getId(),
                response.getName(),
                response.getIsGroup(),
                response.getAvatarUrl(),
                response.getCreatedById(),
                response.getCreatedAt(),
                response.getUpdatedAt()
        );
    }

    public static ChatMessageResponse toDto(com.aiplatform.chat.proto.MessageResponse response) {
        return new ChatMessageResponse(
                response.getId(),
                response.getContent(),
                response.getImageUrl(),
                response.getUserId(),
                response.getChatroomId(),
                response.getAiModelId(),
                response.getIsEdited(),
                response.getCreatedAt(),
                response.getUpdatedAt()
        );
    }
}
