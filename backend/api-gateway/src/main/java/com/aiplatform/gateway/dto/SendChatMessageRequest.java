package com.aiplatform.gateway.dto;

public record SendChatMessageRequest(
        String otherUserId,
        String chatroomId,
        String aiModelId,
        String content,
        String fileId,
        String fileBase64,
        String fileOriginalName,
        String fileContentType
) {}
