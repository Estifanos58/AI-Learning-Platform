package com.aiplatform.gateway.security;

import com.aiplatform.gateway.config.GatewayAuthCookieProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpCookie;
import org.springframework.http.ResponseCookie;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.security.SecureRandom;
import java.time.Duration;
import java.util.Base64;

/**
 * Manages server-controlled HttpOnly auth cookies and double-submit CSRF cookies.
 */
@Service
@RequiredArgsConstructor
public class AuthCookieService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final GatewayAuthCookieProperties cookieProperties;

    public String setAuthCookies(
            ServerHttpResponse response,
            String accessToken,
            long accessTokenMaxAgeSeconds,
            String refreshToken
    ) {
        long effectiveAccessMaxAge = accessTokenMaxAgeSeconds > 0
                ? accessTokenMaxAgeSeconds
                : cookieProperties.getDefaultAccessTokenMaxAgeSeconds();

        if (StringUtils.hasText(accessToken)) {
            response.addCookie(buildCookie(
                    cookieProperties.getAccessTokenName(),
                    accessToken,
                    Duration.ofSeconds(effectiveAccessMaxAge),
                    true
            ));
        }

        if (StringUtils.hasText(refreshToken)) {
            response.addCookie(buildCookie(
                    cookieProperties.getRefreshTokenName(),
                    refreshToken,
                    Duration.ofSeconds(cookieProperties.getRefreshTokenMaxAgeSeconds()),
                    true
            ));
        }

        String csrfToken = generateCsrfToken();
        response.addCookie(buildCookie(
                cookieProperties.getCsrfTokenName(),
                csrfToken,
                Duration.ofSeconds(cookieProperties.getRefreshTokenMaxAgeSeconds()),
                false
        ));
        return csrfToken;
    }

    public String ensureCsrfCookie(ServerHttpRequest request, ServerHttpResponse response) {
        String existing = readCookie(request, cookieProperties.getCsrfTokenName());
        if (StringUtils.hasText(existing)) {
            return existing;
        }
        String csrfToken = generateCsrfToken();
        response.addCookie(buildCookie(
                cookieProperties.getCsrfTokenName(),
                csrfToken,
                Duration.ofSeconds(cookieProperties.getRefreshTokenMaxAgeSeconds()),
                false
        ));
        return csrfToken;
    }

    public void clearAuthCookies(ServerHttpResponse response) {
        response.addCookie(buildCookie(cookieProperties.getAccessTokenName(), "", Duration.ZERO, true));
        response.addCookie(buildCookie(cookieProperties.getRefreshTokenName(), "", Duration.ZERO, true));
        response.addCookie(buildCookie(cookieProperties.getCsrfTokenName(), "", Duration.ZERO, false));
    }

    public String extractAccessTokenCookie(ServerHttpRequest request) {
        return readCookie(request, cookieProperties.getAccessTokenName());
    }

    public String extractRefreshTokenCookie(ServerHttpRequest request) {
        return readCookie(request, cookieProperties.getRefreshTokenName());
    }

    public String extractCsrfTokenCookie(ServerHttpRequest request) {
        return readCookie(request, cookieProperties.getCsrfTokenName());
    }

    private String readCookie(ServerHttpRequest request, String name) {
        if (request == null) {
            return null;
        }
        HttpCookie cookie = request.getCookies().getFirst(name);
        if (cookie == null || !StringUtils.hasText(cookie.getValue())) {
            return null;
        }
        return cookie.getValue().trim();
    }

    private ResponseCookie buildCookie(String name, String value, Duration maxAge, boolean httpOnly) {
        ResponseCookie.ResponseCookieBuilder builder = ResponseCookie.from(name, value)
                .httpOnly(httpOnly)
                .secure(cookieProperties.isSecure())
                .sameSite(cookieProperties.getSameSite())
                .path(cookieProperties.getPath())
                .maxAge(maxAge);

        if (StringUtils.hasText(cookieProperties.getDomain())) {
            builder.domain(cookieProperties.getDomain().trim());
        }
        return builder.build();
    }

    private String generateCsrfToken() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
