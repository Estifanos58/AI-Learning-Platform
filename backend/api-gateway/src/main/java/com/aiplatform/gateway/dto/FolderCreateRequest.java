package com.aiplatform.gateway.dto;

import jakarta.validation.constraints.NotBlank;

public record FolderCreateRequest(
        @NotBlank String name,
        String parentId
) {
}
