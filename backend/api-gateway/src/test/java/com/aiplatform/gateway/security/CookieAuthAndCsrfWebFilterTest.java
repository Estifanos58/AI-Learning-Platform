package com.aiplatform.gateway.security;

import com.aiplatform.gateway.config.GatewayAuthCookieProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpCookie;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

class CookieAuthAndCsrfWebFilterTest {

    private CookieAuthAndCsrfWebFilter filter;

    @BeforeEach
    void setUp() {
        GatewayAuthCookieProperties cookieProperties = new GatewayAuthCookieProperties();
        AuthCookieService authCookieService = new AuthCookieService(cookieProperties);
        filter = new CookieAuthAndCsrfWebFilter(authCookieService, "http://localhost:3000,https://app.example.com");
    }

    @Test
    @DisplayName("Rejects cookie-authenticated POST without CSRF token header")
    void rejectsCookieAuthenticatedPostWithoutCsrfHeader() {
        MockServerHttpRequest request = MockServerHttpRequest.post("/api/chat/messages")
                .header(HttpHeaders.ORIGIN, "http://localhost:3000")
                .cookie(new HttpCookie("app_access_token", "jwt-token"))
                .cookie(new HttpCookie("app_csrf_token", "csrf-secret-123"))
                .build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);

        WebFilterChain chain = ex -> Mono.error(new AssertionError("Chain should not be called"));

        StepVerifier.create(filter.filter(exchange, chain)).verifyComplete();
        assertThat(exchange.getResponse().getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    @DisplayName("Rejects cookie-authenticated POST from disallowed Origin even with CSRF token")
    void rejectsCookieAuthenticatedPostFromDisallowedOrigin() {
        MockServerHttpRequest request = MockServerHttpRequest.post("/api/chat/messages")
                .header(HttpHeaders.ORIGIN, "https://evil.attacker.test")
                .header(CookieAuthAndCsrfWebFilter.CSRF_HEADER, "csrf-secret-123")
                .cookie(new HttpCookie("app_access_token", "jwt-token"))
                .cookie(new HttpCookie("app_csrf_token", "csrf-secret-123"))
                .build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);

        WebFilterChain chain = ex -> Mono.error(new AssertionError("Chain should not be called"));

        StepVerifier.create(filter.filter(exchange, chain)).verifyComplete();
        assertThat(exchange.getResponse().getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    @DisplayName("Allows cookie-authenticated POST with valid CSRF token and bridges cookie to Authorization header")
    void allowsValidCsrfAndBridgesAccessCookie() {
        MockServerHttpRequest request = MockServerHttpRequest.post("/api/chat/messages")
                .header(HttpHeaders.ORIGIN, "http://localhost:3000")
                .header(CookieAuthAndCsrfWebFilter.CSRF_HEADER, "csrf-secret-123")
                .cookie(new HttpCookie("app_access_token", "jwt-cookie-token"))
                .cookie(new HttpCookie("app_csrf_token", "csrf-secret-123"))
                .build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);

        AtomicReference<String> observedAuthHeader = new AtomicReference<>();
        WebFilterChain chain = ex -> {
            observedAuthHeader.set(ex.getRequest().getHeaders().getFirst(HttpHeaders.AUTHORIZATION));
            return Mono.empty();
        };

        StepVerifier.create(filter.filter(exchange, chain)).verifyComplete();
        assertThat(observedAuthHeader.get()).isEqualTo("Bearer jwt-cookie-token");
    }

    @Test
    @DisplayName("Allows cookie-authenticated GET without CSRF header and bridges cookie")
    void allowsGetWithoutCsrfAndBridgesAccessCookie() {
        MockServerHttpRequest request = MockServerHttpRequest.get("/api/files")
                .cookie(new HttpCookie("app_access_token", "jwt-cookie-token"))
                .build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);

        AtomicReference<String> observedAuthHeader = new AtomicReference<>();
        WebFilterChain chain = ex -> {
            observedAuthHeader.set(ex.getRequest().getHeaders().getFirst(HttpHeaders.AUTHORIZATION));
            return Mono.empty();
        };

        StepVerifier.create(filter.filter(exchange, chain)).verifyComplete();
        assertThat(observedAuthHeader.get()).isEqualTo("Bearer jwt-cookie-token");
    }
}
