package com.aiplatform.gateway.dto;

import java.util.List;

public record DirectChatroomDetailResponse(
        String id,
        String title,
        String createdAt,
        String updatedAt,
        List<DirectChatMessageResponse> messages
) {
}
