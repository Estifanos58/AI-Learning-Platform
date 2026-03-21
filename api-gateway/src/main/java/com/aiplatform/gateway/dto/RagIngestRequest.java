package com.aiplatform.gateway.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

public record RagIngestRequest(
        @NotBlank String fileId,
        String ownerId,
        String folderId,
        @NotBlank String storagePath,
        @NotBlank String contentType,
        String fileName,
        @Size(max = 200) List<@Size(max = 200) String> tags
) {}