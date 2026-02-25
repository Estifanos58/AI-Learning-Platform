package com.aiplatform.auth.dto;

public record SignupResponse(
        String message,
        String accessToken,
        String refreshToken,
        UserSummaryResponse user
) {
}