package com.aiplatform.gateway.security;

import lombok.RequiredArgsConstructor;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.Set;

@Component
@RequiredArgsConstructor
public class JwtGlobalFilter implements GlobalFilter, Ordered {

    private static final Set<String> PUBLIC_AUTH_PATHS = Set.of(
            "/api/auth/signup",
            "/api/auth/login",
            "/api/auth/verify-email",
            "/api/auth/refresh",
            "/api/auth/logout",
            "/api/auth/forgot-password",
            "/api/auth/reset-password",
            "/api/auth/session",
            "/api/auth/csrf",
            "/api/internal/auth/signup",
            "/api/internal/auth/login",
            "/api/internal/auth/verify-email",
            "/api/internal/auth/refresh",
            "/api/internal/auth/logout",
            "/api/internal/auth/forgot-password",
            "/api/internal/auth/reset-password",
            "/api/internal/auth/session",
            "/api/internal/auth/csrf"
    );

    private final JwtValidationService jwtValidationService;
    private final AuthCookieService authCookieService;

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, org.springframework.cloud.gateway.filter.GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getURI().getPath();

        if (PUBLIC_AUTH_PATHS.contains(path)
            || "OPTIONS".equalsIgnoreCase(request.getMethod().name())) {
            return chain.filter(exchange);
        }

        String token = null;
        String authorization = request.getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
        if (StringUtils.hasText(authorization) && authorization.startsWith("Bearer ")) {
            token = authorization.substring(7);
        } else {
            token = authCookieService.extractAccessTokenCookie(request);
        }

        if (!StringUtils.hasText(token)) {
            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return exchange.getResponse().setComplete();
        }

        if (!jwtValidationService.isValid(token)) {
            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return exchange.getResponse().setComplete();
        }

        return chain.filter(exchange);
    }

    @Override
    public int getOrder() {
        return -100;
    }
}
