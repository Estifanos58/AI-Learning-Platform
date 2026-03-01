package com.aiplatform.gateway.dto;

import java.util.List;

public record ListChatMessagesResponse(
        List<ChatMessageResponse> messages,
        long total
) {
}
