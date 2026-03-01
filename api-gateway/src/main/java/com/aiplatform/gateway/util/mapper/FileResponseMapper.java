package com.aiplatform.gateway.util.mapper;

import com.aiplatform.gateway.dto.FileResponse;

public final class FileResponseMapper {

    private FileResponseMapper() {
    }

    public static FileResponse toDto(com.aiplatform.file.proto.FileResponse response) {
        return new FileResponse(
                response.getId(),
                response.getOwnerId(),
            response.getFolderId(),
                response.getFileType(),
                response.getOriginalName(),
                response.getStoredName(),
                response.getContentType(),
                response.getFileSize(),
                response.getStoragePath(),
                response.getIsShareable(),
                response.getDeleted(),
                response.getCreatedAt(),
                response.getUpdatedAt()
        );
    }
}
