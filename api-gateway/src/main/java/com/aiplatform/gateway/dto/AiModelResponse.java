package com.aiplatform.gateway.dto;

public record AiModelResponse(
        String modelId,
        String modelName,
        String family,
        int contextLength,
        String capabilitiesJson,
        boolean active,
        int providerCount
) {}
