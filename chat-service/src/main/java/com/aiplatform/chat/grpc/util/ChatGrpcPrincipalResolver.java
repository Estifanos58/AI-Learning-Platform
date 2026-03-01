package com.aiplatform.chat.grpc.util;

import java.util.UUID;

import com.aiplatform.chat.exception.UnauthorizedChatAccessException;
import com.aiplatform.chat.grpc.GrpcContextKeys;
import com.aiplatform.chat.service.AuthenticatedPrincipal;

public final class ChatGrpcPrincipalResolver {

    private ChatGrpcPrincipalResolver() {
    }

    public static AuthenticatedPrincipal requirePrincipal() {
        String rawUserId = GrpcContextKeys.USER_ID.get();
        if (rawUserId == null || rawUserId.isBlank()) {
            throw new UnauthorizedChatAccessException("Missing authenticated user metadata");
        }

        return new AuthenticatedPrincipal(
                UUID.fromString(rawUserId),
                GrpcContextKeys.UNIVERSITY_ID.get(),
                GrpcContextKeys.USER_ROLES.get(),
                GrpcContextKeys.CORRELATION_ID.get()
        );
    }
}
