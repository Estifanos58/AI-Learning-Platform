package com.aiplatform.profile.grpc.util;

import java.util.UUID;

public final class UserProfileGrpcRequestParser {

    private UserProfileGrpcRequestParser() {
    }

    public static UUID parseOptionalUuid(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return UUID.fromString(value);
    }
}
