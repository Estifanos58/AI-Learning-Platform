package com.aiplatform.gateway.controller;

import com.aiplatform.auth.proto.AuthServiceGrpc;
import com.aiplatform.auth.proto.Role;
import com.aiplatform.auth.proto.UserSummary;
import com.aiplatform.gateway.config.GatewayAuthCookieProperties;
import com.aiplatform.gateway.config.GrpcAuthProperties;
import com.aiplatform.gateway.dto.UpdateUserRoleRequest;
import com.aiplatform.gateway.dto.UserSummaryResponse;
import com.aiplatform.gateway.security.AuthCookieService;
import com.aiplatform.gateway.security.JwtValidationService;
import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;
import reactor.test.StepVerifier;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GatewayAuthControllerTest {

    @Mock
    private AuthServiceGrpc.AuthServiceBlockingStub authStub;
    @Mock
    private GrpcAuthProperties grpcAuthProperties;
    @Mock
    private JwtValidationService jwtValidationService;

    private GatewayAuthCookieProperties cookieProperties;
    private AuthCookieService authCookieService;
    private GatewayAuthController controller;

    @BeforeEach
    void setUp() {
        cookieProperties = new GatewayAuthCookieProperties();
        authCookieService = new AuthCookieService(cookieProperties);
        controller = new GatewayAuthController(grpcAuthProperties, jwtValidationService, authCookieService, cookieProperties);
        ReflectionTestUtils.setField(controller, "authStub", authStub);
    }

    @Test
    @DisplayName("updateUserRole rejects non-admin user with 403 Forbidden")
    void updateUserRole_rejectsNonAdminWithForbidden() {
        String targetUserId = UUID.randomUUID().toString();
        String callerUserId = UUID.randomUUID().toString();

        // Non-admin principal (STUDENT)
        Claims claims = mock(Claims.class);
        when(claims.getSubject()).thenReturn(callerUserId);
        when(claims.get("role", String.class)).thenReturn("STUDENT");
        when(jwtValidationService.parseClaims("student-token")).thenReturn(claims);

        UpdateUserRoleRequest request = new UpdateUserRoleRequest(Role.INSTRUCTOR);

        StepVerifier.create(controller.updateUserRole(targetUserId, request, "Bearer student-token", "corr-1"))
                .expectErrorMatches(throwable -> throwable instanceof ResponseStatusException &&
                        ((ResponseStatusException) throwable).getStatusCode() == HttpStatus.FORBIDDEN)
                .verify();
    }

    @Test
    @DisplayName("updateUserRole allows admin user and returns updated user summary")
    void updateUserRole_allowsAdminUser() {
        String targetUserId = UUID.randomUUID().toString();
        String adminUserId = UUID.randomUUID().toString();

        Claims claims = mock(Claims.class);
        when(claims.getSubject()).thenReturn(adminUserId);
        when(claims.get("role", String.class)).thenReturn("ADMIN");
        when(jwtValidationService.parseClaims("admin-token")).thenReturn(claims);
        when(grpcAuthProperties.getServiceSecret()).thenReturn("test-secret");
        when(authStub.withInterceptors(any())).thenReturn(authStub);

        UserSummary summary = UserSummary.newBuilder()
                .setId(targetUserId)
                .setEmail("promoted@example.com")
                .setUsername("promoted")
                .setRole(Role.INSTRUCTOR)
                .setStatus("ACTIVE")
                .setEmailVerified(true)
                .build();
        when(authStub.updateUserRole(any())).thenReturn(summary);

        UpdateUserRoleRequest request = new UpdateUserRoleRequest(Role.INSTRUCTOR);

        StepVerifier.create(controller.updateUserRole(targetUserId, request, "Bearer admin-token", "corr-2"))
                .assertNext((ResponseEntity<UserSummaryResponse> response) -> {
                    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
                    assertThat(response.getBody()).isNotNull();
                    assertThat(response.getBody().role()).isEqualTo(Role.INSTRUCTOR);
                })
                .verifyComplete();
    }

    @Test
    @DisplayName("login sets HttpOnly, Secure, SameSite auth cookies and omits raw tokens from JSON body by default")
    void login_setsHttpOnlySecureCookiesAndOmitsTokensFromBody() {
        when(grpcAuthProperties.getServiceSecret()).thenReturn("test-secret");
        when(authStub.withInterceptors(any())).thenReturn(authStub);

        com.aiplatform.auth.proto.AuthResponse protoResponse = com.aiplatform.auth.proto.AuthResponse.newBuilder()
                .setAccessToken("access-jwt-secret")
                .setRefreshToken("refresh-secret-token")
                .setTokenType("Bearer")
                .setAccessTokenExpiresInSeconds(900)
                .setUser(UserSummary.newBuilder()
                        .setId(UUID.randomUUID().toString())
                        .setEmail("student@example.com")
                        .setUsername("student")
                        .setRole(Role.STUDENT)
                        .setStatus("ACTIVE")
                        .setEmailVerified(true)
                        .build())
                .build();
        when(authStub.login(any())).thenReturn(protoResponse);

        org.springframework.mock.http.server.reactive.MockServerHttpResponse mockResponse =
                new org.springframework.mock.http.server.reactive.MockServerHttpResponse();

        StepVerifier.create(controller.login(
                        new com.aiplatform.gateway.dto.LoginRequest("student@example.com", "Password123!"),
                        "corr-login",
                        mockResponse
                ))
                .assertNext(resp -> {
                    assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
                    assertThat(resp.getBody()).isNotNull();
                    assertThat(resp.getBody().accessToken()).isNull();
                    assertThat(resp.getBody().refreshToken()).isNull();
                    assertThat(resp.getBody().user().email()).isEqualTo("student@example.com");
                })
                .verifyComplete();

        var accessCookie = mockResponse.getCookies().getFirst("app_access_token");
        var refreshCookie = mockResponse.getCookies().getFirst("app_refresh_token");
        var csrfCookie = mockResponse.getCookies().getFirst("app_csrf_token");

        assertThat(accessCookie).isNotNull();
        assertThat(accessCookie.isHttpOnly()).isTrue();
        assertThat(accessCookie.isSecure()).isTrue();
        assertThat(accessCookie.getSameSite()).isEqualTo("Lax");
        assertThat(accessCookie.getValue()).isEqualTo("access-jwt-secret");

        assertThat(refreshCookie).isNotNull();
        assertThat(refreshCookie.isHttpOnly()).isTrue();
        assertThat(refreshCookie.isSecure()).isTrue();
        assertThat(refreshCookie.getValue()).isEqualTo("refresh-secret-token");

        assertThat(csrfCookie).isNotNull();
        assertThat(csrfCookie.isHttpOnly()).isFalse();
        assertThat(csrfCookie.isSecure()).isTrue();
        assertThat(csrfCookie.getValue()).isNotBlank();
    }

    @Test
    @DisplayName("logout revokes cookie refresh token and clears auth cookies")
    void logout_clearsAuthCookies() {
        when(grpcAuthProperties.getServiceSecret()).thenReturn("test-secret");
        when(authStub.withInterceptors(any())).thenReturn(authStub);
        when(authStub.logout(any())).thenReturn(
                com.aiplatform.auth.proto.SimpleResponse.newBuilder().setMessage("Logout successful").build()
        );

        var mockRequest = org.springframework.mock.http.server.reactive.MockServerHttpRequest.post("/api/auth/logout")
                .cookie(new org.springframework.http.HttpCookie("app_refresh_token", "refresh-secret-token"))
                .build();
        var mockResponse = new org.springframework.mock.http.server.reactive.MockServerHttpResponse();

        StepVerifier.create(controller.logout(null, "corr-logout", mockRequest, mockResponse))
                .assertNext(resp -> assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK))
                .verifyComplete();

        assertThat(mockResponse.getCookies().getFirst("app_access_token").getMaxAge().isZero()).isTrue();
        assertThat(mockResponse.getCookies().getFirst("app_refresh_token").getMaxAge().isZero()).isTrue();
        assertThat(mockResponse.getCookies().getFirst("app_csrf_token").getMaxAge().isZero()).isTrue();
    }
}
