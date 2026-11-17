package com.aiplatform.gateway.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdateChatroomTitleRequest(
        @NotBlank String title
) {
}
