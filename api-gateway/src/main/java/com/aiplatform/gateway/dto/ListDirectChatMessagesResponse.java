package com.aiplatform.gateway.dto;

import java.util.List;

public record ListDirectChatMessagesResponse(
        List<DirectChatMessageResponse> messages,
        long total
) {
}
