package com.aiplatform.file.grpc.util;

import com.aiplatform.file.domain.FileEntity;
import com.aiplatform.file.proto.FileResponse;

import java.time.format.DateTimeFormatter;

public final class FileGrpcResponseMapper {

    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    private FileGrpcResponseMapper() {
    }

    public static FileResponse toResponse(FileEntity file) {
        FileResponse.Builder builder = FileResponse.newBuilder()
                .setId(file.getId().toString())
                .setOwnerId(file.getOwnerId().toString())
            .setFolderId(file.getFolderId().toString())
                .setFileType(com.aiplatform.file.proto.FileType.valueOf(file.getFileType().name()))
                .setOriginalName(file.getOriginalName())
                .setStoredName(file.getStoredName())
                .setFileSize(file.getFileSize())
                .setStoragePath(file.getStoragePath())
                .setIsShareable(Boolean.TRUE.equals(file.getIsShareable()))
                .setDeleted(Boolean.TRUE.equals(file.getDeleted()))
                .setCreatedAt(TIME_FORMATTER.format(file.getCreatedAt()))
                .setUpdatedAt(TIME_FORMATTER.format(file.getUpdatedAt()));

        if (file.getContentType() != null) {
            builder.setContentType(file.getContentType());
        }

        return builder.build();
    }
}
