package com.aiplatform.file.grpc.util;

import com.aiplatform.file.domain.FolderEntity;
import com.aiplatform.file.proto.FolderResponse;

import java.time.format.DateTimeFormatter;

public final class FolderGrpcResponseMapper {

    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    private FolderGrpcResponseMapper() {
    }

    public static FolderResponse toResponse(FolderEntity folder) {
        FolderResponse.Builder builder = FolderResponse.newBuilder()
                .setId(folder.getId().toString())
                .setOwnerId(folder.getOwnerId().toString())
                .setName(folder.getName())
                .setDeleted(Boolean.TRUE.equals(folder.getDeleted()))
                .setCreatedAt(TIME_FORMATTER.format(folder.getCreatedAt()))
                .setUpdatedAt(TIME_FORMATTER.format(folder.getUpdatedAt()));

        if (folder.getParentId() != null) {
            builder.setParentId(folder.getParentId().toString());
        }

        return builder.build();
    }
}
