package com.aiplatform.gateway.dto;

public record AiApiKeyResponse(
        String modelId,
        String status
) {}