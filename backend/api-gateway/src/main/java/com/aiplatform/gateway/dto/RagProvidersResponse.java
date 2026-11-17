package com.aiplatform.gateway.dto;

import java.util.List;

public record RagProvidersResponse(
        List<String> availableProviders
) {}