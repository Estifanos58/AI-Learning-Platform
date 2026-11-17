package com.aiplatform.gateway.dto;

import com.aiplatform.file.proto.FileType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record FileUploadRequest(
        @NotNull FileType fileType,
        @NotBlank String folderId,
        @NotBlank String originalName,
        String contentType,
        @NotBlank String contentBase64,
        boolean isShareable
) {
}
