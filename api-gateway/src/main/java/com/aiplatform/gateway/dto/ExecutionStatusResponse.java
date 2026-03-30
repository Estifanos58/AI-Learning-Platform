package com.aiplatform.gateway.dto;

public record ExecutionStatusResponse(
        String executionId,
        String status,
        String messageId,
        String chatroomId,
        String createdAt,
        String completedAt,
        String error,
        String streamKey
) {
}
