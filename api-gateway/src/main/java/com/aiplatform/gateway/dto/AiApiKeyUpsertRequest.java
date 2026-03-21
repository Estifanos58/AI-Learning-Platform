package com.aiplatform.gateway.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AiApiKeyUpsertRequest(
        @NotBlank String modelId,
        @NotBlank @Size(max = 4096) String apiKey
) {}