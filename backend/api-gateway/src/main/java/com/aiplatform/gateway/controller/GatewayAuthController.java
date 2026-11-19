package com.aiplatform.gateway.controller;

import com.aiplatform.auth.proto.AuthServiceGrpc;
import com.aiplatform.auth.proto.ResendVerificationRequest;
import com.aiplatform.auth.proto.Role;
import com.aiplatform.auth.proto.SimpleResponse;
import com.aiplatform.auth.proto.VerifyRequest;
import com.aiplatform.gateway.config.GatewayAuthCookieProperties;
import com.aiplatform.gateway.config.GrpcAuthProperties;
import com.aiplatform.gateway.dto.ApiMessageResponse;
import com.aiplatform.gateway.dto.AuthResponse;
import com.aiplatform.gateway.dto.AuthSessionResponse;
import com.aiplatform.gateway.dto.CsrfTokenResponse;
import com.aiplatform.gateway.dto.ForgotPasswordRequest;
import com.aiplatform.gateway.dto.LoginRequest;
import com.aiplatform.gateway.dto.LogoutRequest;
import com.aiplatform.gateway.dto.RefreshRequest;
import com.aiplatform.gateway.dto.ResetPasswordRequest;
import com.aiplatform.gateway.dto.SignupRequest;
import com.aiplatform.gateway.dto.UpdateUserRoleRequest;
import com.aiplatform.gateway.dto.UserSummaryResponse;
import com.aiplatform.gateway.dto.VerifyEmailRequest;
import com.aiplatform.gateway.security.AuthCookieService;
import com.aiplatform.gateway.security.JwtValidationService;
import com.aiplatform.gateway.util.GatewayAuthorizationUtils;
import com.aiplatform.gateway.util.GatewayPrincipal;
import com.aiplatform.gateway.util.GatewayPrincipalResolver;
import com.aiplatform.gateway.util.GatewayRequestUtils;
import com.aiplatform.gateway.util.GrpcExceptionMapper;
import com.aiplatform.gateway.util.mapper.AuthResponseMapper;
import io.grpc.Metadata;
import io.grpc.stub.MetadataUtils;
import io.jsonwebtoken.Claims;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.devh.boot.grpc.client.inject.GrpcClient;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
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
    private final AuthCookieService authCookieService;
    private final GatewayAuthCookieProperties cookieProperties;

    @GetMapping("/csrf")
    public Mono<ResponseEntity<CsrfTokenResponse>> csrf(ServerHttpRequest request, ServerHttpResponse response) {
        String csrfToken = authCookieService.ensureCsrfCookie(request, response);
        return Mono.just(ResponseEntity.ok(new CsrfTokenResponse(csrfToken)));
    }

    @GetMapping("/session")
    public Mono<ResponseEntity<AuthSessionResponse>> session(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            ServerHttpRequest request,
            ServerHttpResponse response
    ) {
        String token = extractAccessToken(authorization, request);
        if (!StringUtils.hasText(token)) {
            return Mono.error(new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated"));
        }

        Claims claims = jwtValidationService.parseClaims(token);
        String userId = claims.getSubject();
        if (!StringUtils.hasText(userId)) {
            return Mono.error(new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token subject is missing"));
        }

        String email = GatewayRequestUtils.defaultString(claims.get("email", String.class));
        String roleStr = GatewayRequestUtils.defaultString(claims.get("role", String.class));
        String status = GatewayRequestUtils.defaultString(claims.get("status", String.class));

        Role role = Role.STUDENT;
        try {
            if (StringUtils.hasText(roleStr)) {
                role = Role.valueOf(roleStr);
            }
        } catch (IllegalArgumentException ignored) {
            role = Role.STUDENT;
        }

        String csrfToken = authCookieService.ensureCsrfCookie(request, response);
        UserSummaryResponse user = new UserSummaryResponse(
                userId,
                email,
                "",
                role,
                status,
                true
        );

        return Mono.just(ResponseEntity.ok(new AuthSessionResponse(true, user, csrfToken)));
    }

    @PostMapping("/signup")
    public Mono<ResponseEntity<AuthResponse>> signup(
            @Valid @RequestBody SignupRequest request,
            @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader,
            ServerHttpResponse httpResponse
    ) {
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
                    authCookieService.setAuthCookies(
                            httpResponse,
                            response.getAccessToken(),
                            response.getAccessTokenExpiresInSeconds(),
                            response.getRefreshToken()
                    );
                    return ResponseEntity.ok(AuthResponseMapper.toDto(response, cookieProperties.isExposeTokensInBody()));
                })
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorMap(GrpcExceptionMapper::toResponseStatus);
    }

    @PostMapping("/login")
    public Mono<ResponseEntity<AuthResponse>> login(
            @Valid @RequestBody LoginRequest request,
            @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader,
            ServerHttpResponse httpResponse
    ) {
        return Mono.fromCallable(() -> {
                    String correlationId = correlationIdOrCreate(correlationHeader);
                    log.info("Gateway forwarding login via gRPC. correlationId={}", correlationId);

                com.aiplatform.auth.proto.AuthResponse response = withMetadata(correlationId).login(
                            com.aiplatform.auth.proto.LoginRequest.newBuilder()
                                    .setEmail(request.email())
                                    .setPassword(request.password())
                                    .build()
                    );
                    authCookieService.setAuthCookies(
                            httpResponse,
                            response.getAccessToken(),
                            response.getAccessTokenExpiresInSeconds(),
                            response.getRefreshToken()
                    );
                    return ResponseEntity.ok(AuthResponseMapper.toDto(response, cookieProperties.isExposeTokensInBody()));
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
    public Mono<ResponseEntity<AuthResponse>> refresh(
            @RequestBody(required = false) RefreshRequest request,
            @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader,
            ServerHttpRequest httpRequest,
            ServerHttpResponse httpResponse
    ) {
        String cookieRefreshToken = authCookieService.extractRefreshTokenCookie(httpRequest);
        String bodyRefreshToken = request != null ? request.refreshToken() : null;
        String effectiveRefreshToken = StringUtils.hasText(cookieRefreshToken) ? cookieRefreshToken : bodyRefreshToken;

        if (!StringUtils.hasText(effectiveRefreshToken)) {
            authCookieService.clearAuthCookies(httpResponse);
            return Mono.error(new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing refresh token"));
        }

        return Mono.fromCallable(() -> {
                String correlationId = correlationIdOrCreate(correlationHeader);
                log.info("Gateway forwarding refresh via gRPC. correlationId={}", correlationId);

                com.aiplatform.auth.proto.AuthResponse response = withMetadata(correlationId).refreshToken(
                            com.aiplatform.auth.proto.RefreshRequest.newBuilder()
                                    .setRefreshToken(effectiveRefreshToken)
                                    .build()
                    );
                    authCookieService.setAuthCookies(
                            httpResponse,
                            response.getAccessToken(),
                            response.getAccessTokenExpiresInSeconds(),
                            response.getRefreshToken()
                    );
                    return ResponseEntity.ok(AuthResponseMapper.toDto(response, cookieProperties.isExposeTokensInBody()));
                })
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorMap(GrpcExceptionMapper::toResponseStatus)
                .doOnError(err -> {
                    if (err instanceof ResponseStatusException rse && rse.getStatusCode() == HttpStatus.UNAUTHORIZED) {
                        authCookieService.clearAuthCookies(httpResponse);
                    }
                });
    }

    @PostMapping("/logout")
    public Mono<ResponseEntity<ApiMessageResponse>> logout(
            @RequestBody(required = false) LogoutRequest request,
            @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader,
            ServerHttpRequest httpRequest,
            ServerHttpResponse httpResponse
    ) {
        String cookieRefreshToken = authCookieService.extractRefreshTokenCookie(httpRequest);
        String bodyRefreshToken = request != null ? request.refreshToken() : null;
        String effectiveRefreshToken = StringUtils.hasText(cookieRefreshToken) ? cookieRefreshToken : bodyRefreshToken;

        return Mono.fromCallable(() -> {
                String correlationId = correlationIdOrCreate(correlationHeader);
                log.info("Gateway forwarding logout via gRPC. correlationId={}", correlationId);

                String message = "Logout successful";
                if (StringUtils.hasText(effectiveRefreshToken)) {
                    SimpleResponse response = withMetadata(correlationId).logout(
                            com.aiplatform.auth.proto.LogoutRequest.newBuilder()
                                    .setRefreshToken(effectiveRefreshToken)
                                    .build()
                    );
                    message = response.getMessage();
                }
                authCookieService.clearAuthCookies(httpResponse);
                return ResponseEntity.ok(new ApiMessageResponse(message));
            })
            .subscribeOn(Schedulers.boundedElastic())
            .onErrorMap(GrpcExceptionMapper::toResponseStatus)
            .doOnError(err -> authCookieService.clearAuthCookies(httpResponse));
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

    private String extractAccessToken(String authorization, ServerHttpRequest request) {
        if (StringUtils.hasText(authorization) && authorization.startsWith("Bearer ")) {
            return authorization.substring(7);
        }
        return authCookieService.extractAccessTokenCookie(request);
    }
}
