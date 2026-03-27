package com.aiplatform.gateway.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AiModelCreateRequest(
        @NotBlank @Size(max = 120) String modelName,
        @NotBlank @Size(max = 80) String family,
        @Min(0) int contextLength,
        String capabilitiesJson,
        boolean active
) {}
