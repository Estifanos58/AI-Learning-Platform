package com.aiplatform.gateway.dto;

import jakarta.validation.constraints.NotBlank;

public record FolderShareRequest(
        @NotBlank String sharedWithUserId
) {
}
