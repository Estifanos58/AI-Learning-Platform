package com.aiplatform.gateway.controller;

import com.aiplatform.auth.proto.AuthServiceGrpc;
import com.aiplatform.auth.proto.ResendVerificationRequest;
import com.aiplatform.auth.proto.SimpleResponse;
import com.aiplatform.auth.proto.VerifyRequest;
import com.aiplatform.gateway.config.GrpcAuthProperties;
import com.aiplatform.gateway.dto.ApiMessageResponse;
import com.aiplatform.gateway.dto.AuthResponse;
import com.aiplatform.gateway.dto.ForgotPasswordRequest;
import com.aiplatform.gateway.dto.LoginRequest;
import com.aiplatform.gateway.dto.LogoutRequest;
import com.aiplatform.gateway.dto.RefreshRequest;
import com.aiplatform.gateway.dto.ResetPasswordRequest;
import com.aiplatform.gateway.dto.SignupRequest;
import com.aiplatform.gateway.dto.UpdateUserRoleRequest;
import com.aiplatform.gateway.dto.UserSummaryResponse;
import com.aiplatform.gateway.dto.VerifyEmailRequest;
import com.aiplatform.gateway.security.JwtValidationService;
import com.aiplatform.gateway.util.GatewayAuthorizationUtils;
import com.aiplatform.gateway.util.GatewayPrincipal;
import com.aiplatform.gateway.util.GatewayPrincipalResolver;
import com.aiplatform.gateway.util.GatewayRequestUtils;
import com.aiplatform.gateway.util.GrpcExceptionMapper;
import com.aiplatform.gateway.util.mapper.AuthResponseMapper;
import io.grpc.Metadata;
import io.grpc.stub.MetadataUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.devh.boot.grpc.client.inject.GrpcClient;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

@Slf4j
@RestController
@RequestMapping("/api/internal/auth")
@RequiredArgsConstructor
public class GatewayAuthController {

    private static final Metadata.Key<String> CORRELATION_ID_KEY = Metadata.Key.of("x-correlation-id", Metadata.ASCII_STRING_MARSHALLER);
    private static final Metadata.Key<String> SERVICE_SECRET_KEY = Metadata.Key.of("x-service-secret", Metadata.ASCII_STRING_MARSHALLER);
    private static final Metadata.Key<String> USER_ID_KEY = Metadata.Key.of("x-user-id", Metadata.ASCII_STRING_MARSHALLER);

    @GrpcClient("auth-service")
    private AuthServiceGrpc.AuthServiceBlockingStub authStub;
    private final GrpcAuthProperties grpcAuthProperties;
    private final JwtValidationService jwtValidationService;

    @PostMapping("/signup")
    public Mono<ResponseEntity<AuthResponse>> signup(@Valid @RequestBody SignupRequest request,
                                                     @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader) {
        log.info("Request came to ={}", request.email());
        return Mono.fromCallable(() -> {
                String correlationId = correlationIdOrCreate(correlationHeader);
                log.info("Gateway forwarding signup via gRPC. correlationId={}", correlationId);

                // Security: Public signup ALWAYS assigns Role.STUDENT regardless of client input.
                com.aiplatform.auth.proto.AuthResponse response = withMetadata(correlationId).signup(
                            com.aiplatform.auth.proto.SignupRequest.newBuilder()
                                    .setEmail(request.email())
                                    .setUsername(request.username())
                                    .setPassword(request.password())
                                    .setRole(com.aiplatform.auth.proto.Role.STUDENT)
                                    .build()
                    );
                    return ResponseEntity.ok(AuthResponseMapper.toDto(response));
                })
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorMap(GrpcExceptionMapper::toResponseStatus);
    }

    @PostMapping("/login")
    public Mono<ResponseEntity<AuthResponse>> login(@Valid @RequestBody LoginRequest request,
                                                    @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader) {
        return Mono.fromCallable(() -> {
                    String correlationId = correlationIdOrCreate(correlationHeader);
                    log.info("Gateway forwarding login via gRPC. correlationId={}", correlationId);

                com.aiplatform.auth.proto.AuthResponse response = withMetadata(correlationId).login(
                            com.aiplatform.auth.proto.LoginRequest.newBuilder()
                                    .setEmail(request.email())
                                    .setPassword(request.password())
                                    .build()
                    );
                    return ResponseEntity.ok(AuthResponseMapper.toDto(response));
                })
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorMap(GrpcExceptionMapper::toResponseStatus);
    }

    @PostMapping("/verify-email")
    public Mono<ResponseEntity<ApiMessageResponse>> verifyEmail(@Valid @RequestBody VerifyEmailRequest request,
                                                                @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader) {
        return Mono.fromCallable(() -> {
                String correlationId = correlationIdOrCreate(correlationHeader);
                log.info("Gateway forwarding verify-email via gRPC. correlationId={}", correlationId);

                SimpleResponse response = withMetadata(correlationId).verifyEmail(
                        VerifyRequest.newBuilder()
                                .setCode(request.code())
                                .build()
                );
                    return ResponseEntity.ok(new ApiMessageResponse(response.getMessage()));
                })
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorMap(GrpcExceptionMapper::toResponseStatus);
    }

    @PostMapping("/resend-verification")
    public Mono<ResponseEntity<ApiMessageResponse>> resendVerification(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader
    ) {
        return Mono.fromCallable(() -> {
                    GatewayPrincipal principal = resolvePrincipal(authorization, correlationHeader);
                    log.info("Gateway forwarding resend-verification via gRPC. correlationId={}", principal.correlationId());

                    SimpleResponse response = withMetadata(principal).resendVerificationCode(
                            ResendVerificationRequest.newBuilder().build()
                    );
                    return ResponseEntity.ok(new ApiMessageResponse(response.getMessage()));
                })
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorMap(GrpcExceptionMapper::toResponseStatus);
    }

    @PostMapping("/refresh")
    public Mono<ResponseEntity<AuthResponse>> refresh(@Valid @RequestBody RefreshRequest request,
                                                      @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader) {
        return Mono.fromCallable(() -> {
                String correlationId = correlationIdOrCreate(correlationHeader);
                log.info("Gateway forwarding refresh via gRPC. correlationId={}", correlationId);

                com.aiplatform.auth.proto.AuthResponse response = withMetadata(correlationId).refreshToken(
                            com.aiplatform.auth.proto.RefreshRequest.newBuilder()
                                    .setRefreshToken(request.refreshToken())
                                    .build()
                    );
                    return ResponseEntity.ok(AuthResponseMapper.toDto(response));
                })
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorMap(GrpcExceptionMapper::toResponseStatus);
    }

    @PostMapping("/logout")
    public Mono<ResponseEntity<ApiMessageResponse>> logout(@Valid @RequestBody LogoutRequest request,
                                                           @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader) {
        return Mono.fromCallable(() -> {
                String correlationId = correlationIdOrCreate(correlationHeader);
                log.info("Gateway forwarding logout via gRPC. correlationId={}", correlationId);

                SimpleResponse response = withMetadata(correlationId).logout(
                            com.aiplatform.auth.proto.LogoutRequest.newBuilder()
                                    .setRefreshToken(request.refreshToken())
                                    .build()
                    );
                    return ResponseEntity.ok(new ApiMessageResponse(response.getMessage()));
                })
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorMap(GrpcExceptionMapper::toResponseStatus);
    }

    @PostMapping("/forgot-password")
    public Mono<ResponseEntity<ApiMessageResponse>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request,
            @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader
    ) {
        return Mono.fromCallable(() -> {
            String correlationId = correlationIdOrCreate(correlationHeader);
            log.info("Gateway forwarding forgot-password via gRPC. correlationId={}", correlationId);

            SimpleResponse response = withMetadata(correlationId).forgotPassword(
                    com.aiplatform.auth.proto.ForgotPasswordRequest.newBuilder()
                            .setEmail(request.email())
                            .build()
            );
            return ResponseEntity.ok(new ApiMessageResponse(response.getMessage()));
        })
        .subscribeOn(Schedulers.boundedElastic())
        .onErrorMap(GrpcExceptionMapper::toResponseStatus);
    }

    @PostMapping("/reset-password")
    public Mono<ResponseEntity<ApiMessageResponse>> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request,
            @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader
    ) {
        return Mono.fromCallable(() -> {
            String correlationId = correlationIdOrCreate(correlationHeader);
            log.info("Gateway forwarding reset-password via gRPC. correlationId={}", correlationId);

            SimpleResponse response = withMetadata(correlationId).resetPassword(
                    com.aiplatform.auth.proto.ResetPasswordRequest.newBuilder()
                            .setToken(request.token())
                            .setNewPassword(request.newPassword())
                            .build()
            );
            return ResponseEntity.ok(new ApiMessageResponse(response.getMessage()));
        })
        .subscribeOn(Schedulers.boundedElastic())
        .onErrorMap(GrpcExceptionMapper::toResponseStatus);
    }

    @PutMapping("/users/{userId}/role")
    public Mono<ResponseEntity<UserSummaryResponse>> updateUserRole(
            @PathVariable String userId,
            @Valid @RequestBody UpdateUserRoleRequest request,
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader
    ) {
        return Mono.fromCallable(() -> {
            GatewayPrincipal principal = resolvePrincipal(authorization, correlationHeader);
            GatewayAuthorizationUtils.requireAdmin(principal);
            log.info("Admin {} updating role for userId={} to {}", principal.userId(), userId, request.role());

            com.aiplatform.auth.proto.UserSummary response = withMetadata(principal).updateUserRole(
                    com.aiplatform.auth.proto.UpdateUserRoleRequest.newBuilder()
                            .setUserId(userId)
                            .setRole(request.role())
                            .build()
            );
            return ResponseEntity.ok(new UserSummaryResponse(
                    response.getId(),
                    response.getEmail(),
                    response.getUsername(),
                    response.getRole(),
                    response.getStatus(),
                    response.getEmailVerified()
            ));
        })
        .subscribeOn(Schedulers.boundedElastic())
        .onErrorMap(GrpcExceptionMapper::toResponseStatus);
    }

    private AuthServiceGrpc.AuthServiceBlockingStub withMetadata(String correlationId) {
        Metadata metadata = new Metadata();
        metadata.put(CORRELATION_ID_KEY, correlationId);
        metadata.put(SERVICE_SECRET_KEY, grpcAuthProperties.getServiceSecret());
        return authStub.withInterceptors(MetadataUtils.newAttachHeadersInterceptor(metadata));
    }

    private AuthServiceGrpc.AuthServiceBlockingStub withMetadata(GatewayPrincipal principal) {
        Metadata metadata = new Metadata();
        metadata.put(CORRELATION_ID_KEY, principal.correlationId());
        metadata.put(SERVICE_SECRET_KEY, grpcAuthProperties.getServiceSecret());
        metadata.put(USER_ID_KEY, principal.userId());
        return authStub.withInterceptors(MetadataUtils.newAttachHeadersInterceptor(metadata));
    }

    private String correlationIdOrCreate(String correlationHeader) {
        return GatewayRequestUtils.correlationIdOrCreate(correlationHeader);
    }

    private GatewayPrincipal resolvePrincipal(String authorization, String correlationHeader) {
        return GatewayPrincipalResolver.resolve(authorization, correlationHeader, jwtValidationService);
    }
}
