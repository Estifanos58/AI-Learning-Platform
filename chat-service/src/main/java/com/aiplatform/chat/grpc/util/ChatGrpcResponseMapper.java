package com.aiplatform.chat.grpc.util;

import com.aiplatform.chat.domain.ChatroomEntity;
import com.aiplatform.chat.domain.MessageEntity;
import com.aiplatform.chat.proto.ChatroomResponse;
import com.aiplatform.chat.proto.MessageResponse;

public final class ChatGrpcResponseMapper {

    private ChatGrpcResponseMapper() {
    }

    public static ChatroomResponse toResponse(ChatroomEntity entity) {
        return ChatroomResponse.newBuilder()
                .setId(entity.getId().toString())
                .setName(defaultString(entity.getName()))
                .setIsGroup(Boolean.TRUE.equals(entity.getIsGroup()))
                .setAvatarUrl(defaultString(entity.getAvatarUrl()))
                .setCreatedById(entity.getCreatedById().toString())
                .setCreatedAt(entity.getCreatedAt().toString())
                .setUpdatedAt(entity.getUpdatedAt().toString())
                .build();
    }

    public static MessageResponse toResponse(MessageEntity entity) {
        return MessageResponse.newBuilder()
                .setId(entity.getId().toString())
                .setContent(defaultString(entity.getContent()))
                .setImageUrl(defaultString(entity.getImageUrl()))
                .setUserId(entity.getUserId().toString())
                .setChatroomId(entity.getChatroomId().toString())
                .setAiModelId(entity.getAiModelId() == null ? "" : entity.getAiModelId().toString())
                .setIsEdited(Boolean.TRUE.equals(entity.getIsEdited()))
                .setCreatedAt(entity.getCreatedAt().toString())
                .setUpdatedAt(entity.getUpdatedAt().toString())
                .build();
    }

    private static String defaultString(String value) {
        return value == null ? "" : value;
    }
}
