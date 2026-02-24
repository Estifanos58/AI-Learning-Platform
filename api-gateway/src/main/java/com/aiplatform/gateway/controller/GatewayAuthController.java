package com.aiplatform.gateway.controller;

import com.aiplatform.auth.proto.AuthServiceGrpc;
import com.aiplatform.auth.proto.SimpleResponse;
import com.aiplatform.auth.proto.VerifyRequest;
import com.aiplatform.gateway.config.GrpcAuthProperties;
import com.aiplatform.gateway.dto.ApiMessageResponse;
import com.aiplatform.gateway.dto.AuthResponse;
import com.aiplatform.gateway.dto.LoginRequest;
import com.aiplatform.gateway.dto.LogoutRequest;
import com.aiplatform.gateway.dto.RefreshRequest;
import com.aiplatform.gateway.dto.SignupRequest;
import com.aiplatform.gateway.dto.UserSummaryResponse;
import com.aiplatform.gateway.dto.VerifyEmailRequest;
import io.grpc.Metadata;
import io.grpc.Status;
import io.grpc.StatusRuntimeException;
import io.grpc.stub.MetadataUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/internal/auth")
@RequiredArgsConstructor
public class GatewayAuthController {

    private static final Metadata.Key<String> CORRELATION_ID_KEY = Metadata.Key.of("x-correlation-id", Metadata.ASCII_STRING_MARSHALLER);
    private static final Metadata.Key<String> SERVICE_SECRET_KEY = Metadata.Key.of("x-service-secret", Metadata.ASCII_STRING_MARSHALLER);

    private final AuthServiceGrpc.AuthServiceBlockingStub authStub;
    private final GrpcAuthProperties grpcAuthProperties;

    @PostMapping("/signup")
    public Mono<ResponseEntity<AuthResponse>> signup(@Valid @RequestBody SignupRequest request,
                                                     @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader) {
        return Mono.fromCallable(() -> {
                String correlationId = correlationIdOrCreate(correlationHeader);
                log.info("Gateway forwarding signup via gRPC. correlationId={}", correlationId);

                com.aiplatform.auth.proto.AuthResponse response = withMetadata(correlationId).signup(
                            com.aiplatform.auth.proto.SignupRequest.newBuilder()
                                    .setEmail(request.email())
                                    .setUsername(request.username())
                                    .setPassword(request.password())
                                    .setRole(request.role())
                                    .build()
                    );
                    return ResponseEntity.ok(toAuthResponse(response));
                })
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorMap(this::mapGrpcException);
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
                    return ResponseEntity.ok(toAuthResponse(response));
                })
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorMap(this::mapGrpcException);
    }

    @PostMapping("/verify-email")
    public Mono<ResponseEntity<ApiMessageResponse>> verifyEmail(@Valid @RequestBody VerifyEmailRequest request,
                                                                @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader) {
        return Mono.fromCallable(() -> {
                String correlationId = correlationIdOrCreate(correlationHeader);
                log.info("Gateway forwarding verify-email via gRPC. correlationId={}", correlationId);

                SimpleResponse response = withMetadata(correlationId).verifyEmail(
                            VerifyRequest.newBuilder()
                                    .setToken(request.token())
                                    .build()
                    );
                    return ResponseEntity.ok(new ApiMessageResponse(response.getMessage()));
                })
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorMap(this::mapGrpcException);
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
                    return ResponseEntity.ok(toAuthResponse(response));
                })
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorMap(this::mapGrpcException);
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
                .onErrorMap(this::mapGrpcException);
    }

    private AuthServiceGrpc.AuthServiceBlockingStub withMetadata(String correlationId) {
        Metadata metadata = new Metadata();
        metadata.put(CORRELATION_ID_KEY, correlationId);
        metadata.put(SERVICE_SECRET_KEY, grpcAuthProperties.getServiceSecret());
        return authStub.withInterceptors(MetadataUtils.newAttachHeadersInterceptor(metadata));
    }

    private String correlationIdOrCreate(String correlationHeader) {
        if (correlationHeader != null && !correlationHeader.isBlank()) {
            return correlationHeader;
        }
        return UUID.randomUUID().toString();
    }

    private AuthResponse toAuthResponse(com.aiplatform.auth.proto.AuthResponse response) {
        UserSummaryResponse user = null;
        if (response.hasUser()) {
            user = new UserSummaryResponse(
                    response.getUser().getId(),
                    response.getUser().getEmail(),
                    response.getUser().getUsername(),
                    response.getUser().getRole(),
                    response.getUser().getStatus(),
                    response.getUser().getEmailVerified()
            );
        }

        return new AuthResponse(
                response.getMessage(),
                response.getAccessToken(),
                response.getRefreshToken(),
                response.getTokenType(),
                response.getAccessTokenExpiresInSeconds(),
                user
        );
    }

    private Throwable mapGrpcException(Throwable throwable) {
        if (!(throwable instanceof StatusRuntimeException statusRuntimeException)) {
            return throwable;
        }

        Status.Code code = statusRuntimeException.getStatus().getCode();
        String description = statusRuntimeException.getStatus().getDescription();
        String message = description == null ? "Gateway request failed" : description;

        HttpStatus status = switch (code) {
            case INVALID_ARGUMENT -> HttpStatus.BAD_REQUEST;
            case UNAUTHENTICATED -> HttpStatus.UNAUTHORIZED;
            case PERMISSION_DENIED -> HttpStatus.FORBIDDEN;
            case NOT_FOUND -> HttpStatus.NOT_FOUND;
            case ALREADY_EXISTS -> HttpStatus.CONFLICT;
            case RESOURCE_EXHAUSTED -> HttpStatus.TOO_MANY_REQUESTS;
            default -> HttpStatus.INTERNAL_SERVER_ERROR;
        };

        return new ResponseStatusException(status, message, throwable);
    }
}
