package com.aiplatform.auth.service.event;

public record VerificationEmailEvent(
        String eventId,
        String userId,
        String email,
        String username,
        String verificationCode,
        String createdAt
) {
}
