package com.aiplatform.gateway.util;

import com.aiplatform.gateway.security.JwtValidationService;
import io.jsonwebtoken.Claims;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

public final class GatewayPrincipalResolver {

    private GatewayPrincipalResolver() {
    }

    public static GatewayPrincipal resolve(String authorization, String correlationHeader, JwtValidationService jwtValidationService) {
        String token = GatewayRequestUtils.bearerToken(authorization);
        Claims claims = jwtValidationService.parseClaims(token);

        String subject = claims.getSubject();
        if (subject == null || subject.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token subject is missing");
        }

        String role = claims.get("role", String.class);
        String universityId = Optional.ofNullable(claims.get("universityId", String.class))
                .orElseGet(() -> GatewayRequestUtils.defaultString(claims.get("university_id", String.class)));

        return new GatewayPrincipal(
                subject,
                GatewayRequestUtils.defaultString(role),
                GatewayRequestUtils.defaultString(universityId),
                GatewayRequestUtils.correlationIdOrCreate(correlationHeader)
        );
    }
}
