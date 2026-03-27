package com.aiplatform.gateway.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AiProviderAttachRequest(
        @NotBlank String modelId,
        @NotBlank @Size(max = 40) String providerName,
        @NotBlank @Size(max = 120) String providerModelName,
        @Min(0) int priority,
        boolean active
) {}
