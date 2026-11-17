package com.aiplatform.gateway.util;

public record GatewayPrincipal(
        String userId,
        String roles,
        String universityId,
        String correlationId
) {
}
