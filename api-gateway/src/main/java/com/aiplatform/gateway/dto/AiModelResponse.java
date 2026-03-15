package com.aiplatform.gateway.dto;

public record AiModelResponse(
        String modelId,
        String modelName,
        String provider,
        int contextLength,
        boolean supportsStreaming,
        boolean userKeyConfigured,
        boolean platformKeyAvailable,
        String description
) {}
