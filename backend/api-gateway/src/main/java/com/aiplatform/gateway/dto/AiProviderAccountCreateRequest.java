package com.aiplatform.gateway.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AiProviderAccountCreateRequest(
        @NotBlank @Size(max = 40) String providerName,
        @NotBlank @Size(max = 120) String accountLabel,
        @NotBlank @Size(max = 4096) String apiKey,
        @Min(1) int rateLimitPerMinute,
        @Min(1) int dailyQuota,
        boolean active
) {}
