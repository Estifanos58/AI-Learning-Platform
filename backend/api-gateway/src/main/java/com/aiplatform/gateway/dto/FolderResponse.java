package com.aiplatform.gateway.dto;

public record FolderResponse(
        String id,
        String ownerId,
        String name,
        String parentId,
        boolean deleted,
        String createdAt,
        String updatedAt
) {
}
