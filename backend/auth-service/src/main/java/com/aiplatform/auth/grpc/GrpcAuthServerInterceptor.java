package com.aiplatform.auth.grpc;

import io.grpc.*;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.devh.boot.grpc.server.interceptor.GrpcGlobalServerInterceptor;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
@GrpcGlobalServerInterceptor
public class GrpcAuthServerInterceptor implements ServerInterceptor {

    private static final String INSECURE_DEFAULT_SECRET = "change-me-shared-secret";
    private static final Metadata.Key<String> CORRELATION_ID_KEY = Metadata.Key.of(GrpcMetadataConstants.CORRELATION_ID_HEADER, Metadata.ASCII_STRING_MARSHALLER);
    private static final Metadata.Key<String> SERVICE_SECRET_KEY = Metadata.Key.of(GrpcMetadataConstants.SERVICE_SECRET_HEADER, Metadata.ASCII_STRING_MARSHALLER);
    private static final Metadata.Key<String> USER_ID_KEY = Metadata.Key.of(GrpcMetadataConstants.USER_ID_HEADER, Metadata.ASCII_STRING_MARSHALLER);

    private final GrpcAuthProperties grpcAuthProperties;

    @Value("${app.environment:production}")
    private String appEnvironment;

    @PostConstruct
    void validateSecretConfiguration() {
        String secret = grpcAuthProperties.getServiceSecret();
        boolean isDevOrTest = "development".equalsIgnoreCase(appEnvironment) || "test".equalsIgnoreCase(appEnvironment);
        if (!isDevOrTest && (secret == null || secret.isBlank() || INSECURE_DEFAULT_SECRET.equals(secret) || secret.length() < 16)) {
            throw new IllegalStateException("APP_GRPC_AUTH_SERVICE_SECRET must be a strong non-default secret (>=16 chars) outside development/test");
        }
    }

    @Override
    public <ReqT, RespT> ServerCall.Listener<ReqT> interceptCall(
            ServerCall<ReqT, RespT> call,
            Metadata headers,
            ServerCallHandler<ReqT, RespT> next
    ) {
        String serviceSecret = headers.get(SERVICE_SECRET_KEY);
        String expectedSecret = grpcAuthProperties.getServiceSecret();
        if (serviceSecret == null || expectedSecret == null || !MessageDigest.isEqual(
                expectedSecret.getBytes(StandardCharsets.UTF_8),
                serviceSecret.getBytes(StandardCharsets.UTF_8))) {
            call.close(Status.UNAUTHENTICATED.withDescription("Invalid service authentication"), new Metadata());
            return new ServerCall.Listener<>() {
            };
        }

        String correlationId = headers.get(CORRELATION_ID_KEY);
        if (correlationId == null || correlationId.isBlank()) {
            correlationId = UUID.randomUUID().toString();
        }
        String userId = headers.get(USER_ID_KEY);

        Context context = Context.current()
                .withValue(GrpcContextKeys.CORRELATION_ID, correlationId)
                .withValue(GrpcContextKeys.USER_ID, userId == null ? "" : userId);

        final String finalCorrelationId = correlationId;
        MDC.put("correlationId", finalCorrelationId);
        try {
            log.info("Incoming gRPC call. method={}, correlationId={}", call.getMethodDescriptor().getFullMethodName(), finalCorrelationId);
            ServerCall.Listener<ReqT> delegate = Contexts.interceptCall(context, call, headers, next);
            return new ForwardingServerCallListener.SimpleForwardingServerCallListener<>(delegate) {
                @Override
                public void onMessage(ReqT message) {
                    MDC.put("correlationId", finalCorrelationId);
                    try {
                        super.onMessage(message);
                    } finally {
                        MDC.remove("correlationId");
                    }
                }

                @Override
                public void onHalfClose() {
                    MDC.put("correlationId", finalCorrelationId);
                    try {
                        super.onHalfClose();
                    } finally {
                        MDC.remove("correlationId");
                    }
                }

                @Override
                public void onCancel() {
                    MDC.put("correlationId", finalCorrelationId);
                    try {
                        super.onCancel();
                    } finally {
                        MDC.remove("correlationId");
                    }
                }

                @Override
                public void onComplete() {
                    MDC.put("correlationId", finalCorrelationId);
                    try {
                        super.onComplete();
                    } finally {
                        MDC.remove("correlationId");
                    }
                }
            };
        } finally {
            MDC.remove("correlationId");
        }
    }
}

