package com.aiplatform.auth.dto;

public record TokenResponse(
        String accessToken,
        String refreshToken,
        String tokenType,
        long accessTokenExpiresInSeconds
) {
}