package com.aiplatform.gateway.dto;

public record AiProviderAccountResponse(
        String accountId,
        String providerName,
        String accountLabel,
        int rateLimitPerMinute,
        int dailyQuota,
        int usedToday,
        String lastUsedAt,
        String lastResetAt,
        boolean active,
        String healthStatus
) {}
