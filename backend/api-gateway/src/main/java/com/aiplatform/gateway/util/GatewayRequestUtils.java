package com.aiplatform.gateway.util;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

public final class GatewayRequestUtils {

    private GatewayRequestUtils() {
    }

    public static String correlationIdOrCreate(String correlationHeader) {
        if (correlationHeader != null && !correlationHeader.isBlank()) {
            return correlationHeader;
        }
        return UUID.randomUUID().toString();
    }

    public static String bearerToken(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing bearer token");
        }
        return authorization.substring(7);
    }

    public static String defaultString(String value) {
        return value == null ? "" : value;
    }
}
