package com.aiplatform.gateway.dto;

import jakarta.validation.constraints.NotBlank;

public record ChatCreateDirectRequest(
        @NotBlank String otherUserId
) {
}
