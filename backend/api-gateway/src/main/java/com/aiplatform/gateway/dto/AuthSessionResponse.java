package com.aiplatform.gateway.dto;

public record AuthSessionResponse(
        boolean authenticated,
        UserSummaryResponse user,
        String csrfToken
) {
}
