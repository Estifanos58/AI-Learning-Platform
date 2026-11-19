package com.aiplatform.gateway.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Enforces CSRF protection for cookie-authenticated state-changing requests (double-submit cookie
 * plus Origin/Referer verification) and bridges HttpOnly access-token cookies to internal Bearer
 * authorization headers for downstream filters and controllers.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class CookieAuthAndCsrfWebFilter implements WebFilter {

    public static final String CSRF_HEADER = "X-CSRF-Token";

    private static final Set<HttpMethod> STATE_CHANGING_METHODS = Set.of(
            HttpMethod.POST,
            HttpMethod.PUT,
            HttpMethod.PATCH,
            HttpMethod.DELETE
    );

    private static final Set<String> CSRF_EXEMPT_PUBLIC_AUTH_PATHS = Set.of(
            "/api/auth/signup",
            "/api/auth/login",
            "/api/auth/verify-email",
            "/api/auth/forgot-password",
            "/api/auth/reset-password",
            "/api/internal/auth/signup",
            "/api/internal/auth/login",
            "/api/internal/auth/verify-email",
            "/api/internal/auth/forgot-password",
            "/api/internal/auth/reset-password"
    );

    private final AuthCookieService authCookieService;
    private final Set<String> allowedOrigins;

    public CookieAuthAndCsrfWebFilter(
            AuthCookieService authCookieService,
            @Value("${GATEWAY_ALLOWED_ORIGINS:http://localhost:3000}") String allowedOriginsCsv
    ) {
        this.authCookieService = authCookieService;
        this.allowedOrigins = Arrays.stream(allowedOriginsCsv.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isEmpty())
                .collect(Collectors.toUnmodifiableSet());
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getURI().getPath();
        HttpMethod method = request.getMethod();

        String authHeader = request.getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
        boolean hasExplicitBearer = StringUtils.hasText(authHeader) && authHeader.startsWith("Bearer ");
        String accessCookie = authCookieService.extractAccessTokenCookie(request);
        String refreshCookie = authCookieService.extractRefreshTokenCookie(request);
        boolean hasAuthCookies = StringUtils.hasText(accessCookie) || StringUtils.hasText(refreshCookie);

        // Enforce CSRF validation on state-changing requests authenticated via browser cookies
        if (method != null
                && STATE_CHANGING_METHODS.contains(method)
                && hasAuthCookies
                && !hasExplicitBearer
                && !CSRF_EXEMPT_PUBLIC_AUTH_PATHS.contains(path)) {

            if (!isOriginAllowed(request)) {
                return forbidden(exchange, "Origin not allowed for cookie-authenticated request");
            }

            String csrfCookie = authCookieService.extractCsrfTokenCookie(request);
            String csrfHeader = request.getHeaders().getFirst(CSRF_HEADER);

            if (!StringUtils.hasText(csrfCookie)
                    || !StringUtils.hasText(csrfHeader)
                    || !constantTimeEquals(csrfCookie, csrfHeader.trim())) {
                return forbidden(exchange, "Invalid or missing CSRF token");
            }
        }

        // Bridge HttpOnly access cookie to internal Authorization header when Bearer header is absent
        if (!hasExplicitBearer && StringUtils.hasText(accessCookie)) {
            ServerHttpRequest mutatedRequest = request.mutate()
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessCookie)
                    .build();
            return chain.filter(exchange.mutate().request(mutatedRequest).build());
        }

        return chain.filter(exchange);
    }

    private boolean isOriginAllowed(ServerHttpRequest request) {
        String origin = request.getHeaders().getFirst(HttpHeaders.ORIGIN);
        if (StringUtils.hasText(origin)) {
            return allowedOrigins.contains(origin.trim());
        }
        String referer = request.getHeaders().getFirst(HttpHeaders.REFERER);
        if (StringUtils.hasText(referer)) {
            try {
                URI uri = URI.create(referer.trim());
                if (uri.getScheme() == null || uri.getHost() == null) {
                    return false;
                }
                String refererOrigin = uri.getPort() > 0
                        ? uri.getScheme() + "://" + uri.getHost() + ":" + uri.getPort()
                        : uri.getScheme() + "://" + uri.getHost();
                return allowedOrigins.contains(refererOrigin);
            } catch (IllegalArgumentException ex) {
                return false;
            }
        }
        // No Origin/Referer header present (e.g. non-browser / SSR / test clients); double-submit CSRF token still required
        return true;
    }

    private boolean constantTimeEquals(String expected, String actual) {
        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                actual.getBytes(StandardCharsets.UTF_8)
        );
    }

    private Mono<Void> forbidden(ServerWebExchange exchange, String message) {
        var response = exchange.getResponse();
        response.setStatusCode(HttpStatus.FORBIDDEN);
        response.getHeaders().setContentType(MediaType.APPLICATION_JSON);
        String body = "{\"status\":403,\"error\":\"Forbidden\",\"message\":\"" + message + "\"}";
        DataBuffer buffer = response.bufferFactory().wrap(body.getBytes(StandardCharsets.UTF_8));
        return response.writeWith(Mono.just(buffer));
    }
}
