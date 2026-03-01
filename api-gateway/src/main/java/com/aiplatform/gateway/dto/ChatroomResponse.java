package com.aiplatform.gateway.dto;

public record ChatroomResponse(
        String id,
        String name,
        boolean isGroup,
        String avatarUrl,
        String createdById,
        String createdAt,
        String updatedAt
) {
}
