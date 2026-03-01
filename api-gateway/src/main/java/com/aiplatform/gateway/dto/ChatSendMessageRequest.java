package com.aiplatform.gateway.dto;

public record ChatSendMessageRequest(
        String content,
        String imageUrl,
        String aiModelId
) {
}
