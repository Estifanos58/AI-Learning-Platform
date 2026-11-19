package com.aiplatform.gateway.util.mapper;

import com.aiplatform.auth.proto.UserSummary;
import com.aiplatform.gateway.dto.AuthResponse;
import com.aiplatform.gateway.dto.UserSummaryResponse;

public final class AuthResponseMapper {

    private AuthResponseMapper() {
    }

    public static AuthResponse toDto(com.aiplatform.auth.proto.AuthResponse response) {
        return toDto(response, true);
    }

    public static AuthResponse toDto(com.aiplatform.auth.proto.AuthResponse response, boolean exposeTokensInBody) {
        UserSummaryResponse user = null;
        if (response.hasUser() && !response.getUser().equals(UserSummary.getDefaultInstance())) {
            user = new UserSummaryResponse(
                    response.getUser().getId(),
                    response.getUser().getEmail(),
                    response.getUser().getUsername(),
                    response.getUser().getRole(),
                    response.getUser().getStatus(),
                    response.getUser().getEmailVerified()
            );
        }

        return new AuthResponse(
                response.getMessage(),
                exposeTokensInBody ? response.getAccessToken() : null,
                exposeTokensInBody ? response.getRefreshToken() : null,
                response.getTokenType(),
                response.getAccessTokenExpiresInSeconds(),
                user
        );
    }
}
