package com.aiplatform.profile.kafka;

public record UserRegisteredEvent(
        String eventId,
        String eventType,
        String userId,
        String email,
        String universityId,
        String timestamp,
        String correlationId
) {
}
