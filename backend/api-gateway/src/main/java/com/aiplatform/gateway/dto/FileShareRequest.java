package com.aiplatform.gateway.dto;

import jakarta.validation.constraints.NotBlank;

public record FileShareRequest(
        @NotBlank String sharedWithUserId
) {
}
