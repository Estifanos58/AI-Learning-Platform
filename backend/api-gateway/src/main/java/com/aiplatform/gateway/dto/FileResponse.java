package com.aiplatform.gateway.dto;

import com.aiplatform.file.proto.FileType;

public record FileResponse(
        String id,
        String ownerId,
        String folderId,
        FileType fileType,
        String originalName,
        String storedName,
        String contentType,
        long fileSize,
        String storagePath,
        boolean isShareable,
        boolean deleted,
        String createdAt,
        String updatedAt
) {
}
