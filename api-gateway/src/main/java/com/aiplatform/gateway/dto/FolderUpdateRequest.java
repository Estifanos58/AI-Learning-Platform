package com.aiplatform.gateway.dto;

import jakarta.validation.constraints.NotBlank;

public record FolderUpdateRequest(
        @NotBlank String name
) {
}
