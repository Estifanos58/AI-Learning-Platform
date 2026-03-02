package com.aiplatform.gateway.dto;

public record SendChatMessageResponse(
        ChatMessageResponse message,
        String chatroomId,
        boolean isNewChatroom
) {}
