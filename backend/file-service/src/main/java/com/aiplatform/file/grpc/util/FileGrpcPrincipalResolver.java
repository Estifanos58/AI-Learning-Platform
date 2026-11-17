package com.aiplatform.file.grpc.util;

import com.aiplatform.file.exception.UnauthorizedFileAccessException;
import com.aiplatform.file.grpc.GrpcContextKeys;
import com.aiplatform.file.service.AuthenticatedPrincipal;

import java.util.UUID;

public final class FileGrpcPrincipalResolver {

    private FileGrpcPrincipalResolver() {
    }

    public static AuthenticatedPrincipal requirePrincipal() {
        String rawUserId = GrpcContextKeys.USER_ID.get();
        if (rawUserId == null || rawUserId.isBlank()) {
            throw new UnauthorizedFileAccessException("Missing authenticated user metadata");
        }

        return new AuthenticatedPrincipal(
                UUID.fromString(rawUserId),
                GrpcContextKeys.UNIVERSITY_ID.get(),
                GrpcContextKeys.USER_ROLES.get(),
                GrpcContextKeys.CORRELATION_ID.get()
        );
    }
}
