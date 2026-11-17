package com.aiplatform.gateway.util;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public final class GatewayAuthorizationUtils {

    private GatewayAuthorizationUtils() {
    }

    public static void requireAdmin(GatewayPrincipal principal) {
        if (!principal.roles().contains("ADMIN")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin role required");
        }
    }
}
