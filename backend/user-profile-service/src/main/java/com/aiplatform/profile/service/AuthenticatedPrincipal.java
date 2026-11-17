package com.aiplatform.profile.service;

import java.util.UUID;

public record AuthenticatedPrincipal(UUID userId, String universityId, String roles, String correlationId) {
}
