package com.aiplatform.auth.dto;

public record SignupResponse(
        String message,
        UserSummaryResponse user
) {
}