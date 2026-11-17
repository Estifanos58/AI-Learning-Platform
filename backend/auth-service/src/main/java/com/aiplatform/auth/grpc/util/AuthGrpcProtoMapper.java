package com.aiplatform.auth.grpc.util;

import com.aiplatform.auth.dto.UserSummaryResponse;
import com.aiplatform.auth.proto.UserSummary;

public final class AuthGrpcProtoMapper {

    private AuthGrpcProtoMapper() {
    }

    public static UserSummary toProtoUser(UserSummaryResponse user) {
        return UserSummary.newBuilder()
                .setId(user.id().toString())
                .setEmail(user.email())
                .setUsername(user.username())
                .setRole(user.role())
                .setStatus(user.status().name())
                .setEmailVerified(Boolean.TRUE.equals(user.emailVerified()))
                .build();
    }
}
