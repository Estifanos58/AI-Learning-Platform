package com.aiplatform.gateway.dto;

public record ChatMessageResponse(
        String id,
        String chatroomId,
        String senderUserId,
        String aiModelId,
        String content,
        String fileId,
        String createdAt
) {}
