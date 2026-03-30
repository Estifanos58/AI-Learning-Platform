package com.aiplatform.gateway.dto;

public record DirectChatMessageResponse(
        String id,
        String chatroomId,
        String role,
        String content,
        String status,
        String createdAt,
        String updatedAt
) {
}
