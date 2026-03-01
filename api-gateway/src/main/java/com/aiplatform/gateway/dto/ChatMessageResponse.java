package com.aiplatform.gateway.dto;

public record ChatMessageResponse(
        String id,
        String content,
        String imageUrl,
        String userId,
        String chatroomId,
        String aiModelId,
        boolean isEdited,
        String createdAt,
        String updatedAt
) {
}
