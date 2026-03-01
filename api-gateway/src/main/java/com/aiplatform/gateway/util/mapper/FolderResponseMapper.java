package com.aiplatform.gateway.util.mapper;

import com.aiplatform.gateway.dto.FolderResponse;

public final class FolderResponseMapper {

    private FolderResponseMapper() {
    }

    public static FolderResponse toDto(com.aiplatform.file.proto.FolderResponse response) {
        return new FolderResponse(
                response.getId(),
                response.getOwnerId(),
                response.getName(),
                response.getParentId(),
                response.getDeleted(),
                response.getCreatedAt(),
                response.getUpdatedAt()
        );
    }
}
