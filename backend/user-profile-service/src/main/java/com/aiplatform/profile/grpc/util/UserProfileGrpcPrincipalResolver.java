package com.aiplatform.profile.grpc.util;

import com.aiplatform.profile.exception.UnauthorizedAccessException;
import com.aiplatform.profile.grpc.GrpcContextKeys;
import com.aiplatform.profile.service.AuthenticatedPrincipal;

import java.util.UUID;

public final class UserProfileGrpcPrincipalResolver {

    private UserProfileGrpcPrincipalResolver() {
    }

    public static AuthenticatedPrincipal requirePrincipal() {
        AuthenticatedPrincipal principal = currentPrincipal();
        if (principal == null || principal.userId() == null) {
            throw new UnauthorizedAccessException("Missing authenticated user metadata");
        }
        return principal;
    }

    public static AuthenticatedPrincipal currentPrincipal() {
        String rawUserId = GrpcContextKeys.USER_ID.get();
        UUID userId = null;
        if (rawUserId != null && !rawUserId.isBlank()) {
            userId = UUID.fromString(rawUserId);
        }
        return new AuthenticatedPrincipal(
                userId,
                GrpcContextKeys.UNIVERSITY_ID.get(),
                GrpcContextKeys.USER_ROLES.get(),
                GrpcContextKeys.CORRELATION_ID.get()
        );
    }
}
