package com.aiplatform.auth.grpc;

import com.aiplatform.auth.dto.ApiMessageResponse;
import com.aiplatform.auth.dto.RequestMetadata;
import com.aiplatform.auth.dto.SignupResponse;
import com.aiplatform.auth.dto.TokenResponse;
import com.aiplatform.auth.dto.VerifyEmailRequest;
import com.aiplatform.auth.proto.AuthResponse;
import com.aiplatform.auth.proto.AuthServiceGrpc;
import com.aiplatform.auth.proto.LoginRequest;
import com.aiplatform.auth.proto.LogoutRequest;
import com.aiplatform.auth.proto.RefreshRequest;
import com.aiplatform.auth.proto.ResendVerificationRequest;
import com.aiplatform.auth.proto.SignupRequest;
import com.aiplatform.auth.proto.SimpleResponse;
import com.aiplatform.auth.proto.VerifyRequest;
import com.aiplatform.auth.grpc.util.AuthGrpcExceptionMapper;
import com.aiplatform.auth.grpc.util.AuthGrpcProtoMapper;
import com.aiplatform.auth.service.AuthService;
import io.grpc.stub.StreamObserver;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.devh.boot.grpc.server.service.GrpcService;

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
                    .setUser(AuthGrpcProtoMapper.toProtoUser(signupResponse.user()))
                    .build());
            responseObserver.onCompleted();
        } catch (Exception exception) {
            responseObserver.onError(AuthGrpcExceptionMapper.toStatusException(exception));
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
                    .setUser(AuthGrpcProtoMapper.toProtoUser(tokenResponse.user()))
                    .build());
            responseObserver.onCompleted();
        } catch (Exception exception) {
            responseObserver.onError(AuthGrpcExceptionMapper.toStatusException(exception));
        }
    }

    @Override
    public void verifyEmail(VerifyRequest request, StreamObserver<SimpleResponse> responseObserver) {
        try {
            String correlationId = GrpcContextKeys.CORRELATION_ID.get();
            log.info("Handling VerifyEmail gRPC request. correlationId={}", correlationId);

            ApiMessageResponse response = authService.verifyEmail(new VerifyEmailRequest(request.getCode()));
            responseObserver.onNext(SimpleResponse.newBuilder().setMessage(response.message()).build());
            responseObserver.onCompleted();
        } catch (Exception exception) {
            responseObserver.onError(AuthGrpcExceptionMapper.toStatusException(exception));
        }
    }

    @Override
    public void resendVerificationCode(ResendVerificationRequest request, StreamObserver<SimpleResponse> responseObserver) {
        try {
            String correlationId = GrpcContextKeys.CORRELATION_ID.get();
            String userId = GrpcContextKeys.USER_ID.get();
            log.info("Handling ResendVerificationCode gRPC request. correlationId={}", correlationId);

            ApiMessageResponse response = authService.resendVerificationCode(
                    new RequestMetadata("grpc-client", "api-gateway", correlationId, userId)
            );
            responseObserver.onNext(SimpleResponse.newBuilder().setMessage(response.message()).build());
            responseObserver.onCompleted();
        } catch (Exception exception) {
            responseObserver.onError(AuthGrpcExceptionMapper.toStatusException(exception));
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
                    .setUser(AuthGrpcProtoMapper.toProtoUser(tokenResponse.user()))
                    .build());
            responseObserver.onCompleted();
        } catch (Exception exception) {
            responseObserver.onError(AuthGrpcExceptionMapper.toStatusException(exception));
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
            responseObserver.onError(AuthGrpcExceptionMapper.toStatusException(exception));
        }
    }
}
