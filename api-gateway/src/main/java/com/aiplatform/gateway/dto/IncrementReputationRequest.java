package com.aiplatform.gateway.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record IncrementReputationRequest(
        @NotBlank String userId,
        @Min(0) int amount
) {
}
