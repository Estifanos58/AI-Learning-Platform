package com.aiplatform.gateway.controller;

import com.aiplatform.auth.proto.AuthServiceGrpc;
import com.aiplatform.auth.proto.Role;
import com.aiplatform.auth.proto.UserSummary;
import com.aiplatform.gateway.config.GrpcAuthProperties;
import com.aiplatform.gateway.dto.UpdateUserRoleRequest;
import com.aiplatform.gateway.dto.UserSummaryResponse;
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

    private GatewayAuthController controller;

    @BeforeEach
    void setUp() {
        controller = new GatewayAuthController(grpcAuthProperties, jwtValidationService);
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
}
