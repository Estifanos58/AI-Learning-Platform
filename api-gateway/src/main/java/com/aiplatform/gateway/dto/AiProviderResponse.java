package com.aiplatform.gateway.dto;

public record AiProviderResponse(
        String providerId,
        String modelId,
        String providerName,
        String providerModelName,
        int priority,
        boolean active
) {}
