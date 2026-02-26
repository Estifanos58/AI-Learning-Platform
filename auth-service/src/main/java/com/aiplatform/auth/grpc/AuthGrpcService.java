package com.aiplatform.auth.grpc;

import com.aiplatform.auth.dto.ApiMessageResponse;
import com.aiplatform.auth.dto.RequestMetadata;
import com.aiplatform.auth.dto.SignupResponse;
import com.aiplatform.auth.dto.TokenResponse;
import com.aiplatform.auth.dto.UserSummaryResponse;
import com.aiplatform.auth.dto.VerifyEmailRequest;
import com.aiplatform.auth.exception.ApiException;
import com.aiplatform.auth.proto.AuthResponse;
import com.aiplatform.auth.proto.AuthServiceGrpc;
import com.aiplatform.auth.proto.LoginRequest;
import com.aiplatform.auth.proto.LogoutRequest;
import com.aiplatform.auth.proto.RefreshRequest;
import com.aiplatform.auth.proto.SignupRequest;
import com.aiplatform.auth.proto.SimpleResponse;
import com.aiplatform.auth.proto.UserSummary;
import com.aiplatform.auth.proto.VerifyRequest;
import com.aiplatform.auth.service.AuthService;
import io.grpc.Status;
import io.grpc.stub.StreamObserver;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.devh.boot.grpc.server.service.GrpcService;
import org.springframework.http.HttpStatus;

@Slf4j
@GrpcService
@RequiredArgsConstructor
public class AuthGrpcService extends AuthServiceGrpc.AuthServiceImplBase {

    private final AuthService authService;

    @Override
    public void signup(@Valid SignupRequest request, StreamObserver<AuthResponse> responseObserver) {
        try {
            String correlationId = GrpcContextKeys.CORRELATION_ID.get();
            log.info("Handling Signup gRPC request. correlationId={}", correlationId);

            SignupResponse signupResponse = authService.signup(new com.aiplatform.auth.dto.SignupRequest(
                    request.getEmail(),
                    request.getUsername(),
                    request.getPassword(),
                    request.getRole()
                ),  new RequestMetadata("grpc-client", "api-gateway", correlationId));

            responseObserver.onNext(AuthResponse.newBuilder()
                    .setMessage(signupResponse.message())
                    .setAccessToken(signupResponse.accessToken())
                    .setRefreshToken(signupResponse.refreshToken())
                    .setUser(toProtoUser(signupResponse.user()))
                    .build());
            responseObserver.onCompleted();
        } catch (Exception exception) {
            responseObserver.onError(toStatusException(exception));
        }
    }

    @Override
    public void login(LoginRequest request, StreamObserver<AuthResponse> responseObserver) {
        try {
            String correlationId = GrpcContextKeys.CORRELATION_ID.get();
            log.info("Handling Login gRPC request. correlationId={}", correlationId);

            TokenResponse tokenResponse = authService.login(
                    new com.aiplatform.auth.dto.LoginRequest(request.getEmail(), request.getPassword()),
                    new RequestMetadata("grpc-client", "api-gateway", correlationId)
            );

            responseObserver.onNext(AuthResponse.newBuilder()
                    .setAccessToken(tokenResponse.accessToken())
                    .setRefreshToken(tokenResponse.refreshToken())
                    .setTokenType(tokenResponse.tokenType())
                    .setAccessTokenExpiresInSeconds(tokenResponse.accessTokenExpiresInSeconds())
                    .build());
            responseObserver.onCompleted();
        } catch (Exception exception) {
            responseObserver.onError(toStatusException(exception));
        }
    }

    @Override
    public void verifyEmail(VerifyRequest request, StreamObserver<SimpleResponse> responseObserver) {
        try {
            String correlationId = GrpcContextKeys.CORRELATION_ID.get();
            log.info("Handling VerifyEmail gRPC request. correlationId={}", correlationId);

            ApiMessageResponse response = authService.verifyEmail(new VerifyEmailRequest(request.getToken()));
            responseObserver.onNext(SimpleResponse.newBuilder().setMessage(response.message()).build());
            responseObserver.onCompleted();
        } catch (Exception exception) {
            responseObserver.onError(toStatusException(exception));
        }
    }

    @Override
    public void refreshToken(RefreshRequest request, StreamObserver<AuthResponse> responseObserver) {
        try {
            String correlationId = GrpcContextKeys.CORRELATION_ID.get();
            log.info("Handling RefreshToken gRPC request. correlationId={}", correlationId);

            TokenResponse tokenResponse = authService.refresh(
                    new com.aiplatform.auth.dto.RefreshRequest(request.getRefreshToken()),
                    new RequestMetadata("grpc-client", "api-gateway", correlationId)
            );

            responseObserver.onNext(AuthResponse.newBuilder()
                    .setAccessToken(tokenResponse.accessToken())
                    .setRefreshToken(tokenResponse.refreshToken())
                    .setTokenType(tokenResponse.tokenType())
                    .setAccessTokenExpiresInSeconds(tokenResponse.accessTokenExpiresInSeconds())
                    .build());
            responseObserver.onCompleted();
        } catch (Exception exception) {
            responseObserver.onError(toStatusException(exception));
        }
    }

    @Override
    public void logout(LogoutRequest request, StreamObserver<SimpleResponse> responseObserver) {
        try {
            String correlationId = GrpcContextKeys.CORRELATION_ID.get();
            log.info("Handling Logout gRPC request. correlationId={}", correlationId);

            ApiMessageResponse response = authService.logout(new com.aiplatform.auth.dto.LogoutRequest(request.getRefreshToken()));
            responseObserver.onNext(SimpleResponse.newBuilder().setMessage(response.message()).build());
            responseObserver.onCompleted();
        } catch (Exception exception) {
            responseObserver.onError(toStatusException(exception));
        }
    }

    private UserSummary toProtoUser(UserSummaryResponse user) {
        return UserSummary.newBuilder()
                .setId(user.id().toString())
                .setEmail(user.email())
                .setUsername(user.username())
                .setRole(user.role())
                .setStatus(user.status().name())
                .setEmailVerified(Boolean.TRUE.equals(user.emailVerified()))
                .build();
    }

    private Status toGrpcStatus(HttpStatus status) {
        return switch (status) {
            case BAD_REQUEST -> Status.INVALID_ARGUMENT;
            case UNAUTHORIZED -> Status.UNAUTHENTICATED;
            case FORBIDDEN -> Status.PERMISSION_DENIED;
            case NOT_FOUND -> Status.NOT_FOUND;
            case CONFLICT -> Status.ALREADY_EXISTS;
            case TOO_MANY_REQUESTS -> Status.RESOURCE_EXHAUSTED;
            default -> Status.INTERNAL;
        };
    }

    private io.grpc.StatusException toStatusException(Exception exception) {
        if (exception instanceof ApiException apiException) {
            return toGrpcStatus(apiException.getStatus())
                    .withDescription(apiException.getMessage())
                    .asException();
        }
        return Status.INTERNAL.withDescription("Unexpected internal error").withCause(exception).asException();
    }
}
