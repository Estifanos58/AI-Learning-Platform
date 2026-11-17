package com.aiplatform.gateway.dto;

public record AuthResponse(
        String message,
        String accessToken,
        String refreshToken,
        String tokenType,
        long accessTokenExpiresInSeconds,
        UserSummaryResponse user
) {
}
