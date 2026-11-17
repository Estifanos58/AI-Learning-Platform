package com.aiplatform.auth.grpc;

import io.grpc.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.devh.boot.grpc.server.interceptor.GrpcGlobalServerInterceptor;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
@GrpcGlobalServerInterceptor
public class GrpcAuthServerInterceptor implements ServerInterceptor {

    private static final Metadata.Key<String> CORRELATION_ID_KEY = Metadata.Key.of(GrpcMetadataConstants.CORRELATION_ID_HEADER, Metadata.ASCII_STRING_MARSHALLER);
    private static final Metadata.Key<String> SERVICE_SECRET_KEY = Metadata.Key.of(GrpcMetadataConstants.SERVICE_SECRET_HEADER, Metadata.ASCII_STRING_MARSHALLER);
    private static final Metadata.Key<String> USER_ID_KEY = Metadata.Key.of(GrpcMetadataConstants.USER_ID_HEADER, Metadata.ASCII_STRING_MARSHALLER);

    private final GrpcAuthProperties grpcAuthProperties;

    @Override
    public <ReqT, RespT> ServerCall.Listener<ReqT> interceptCall(
            ServerCall<ReqT, RespT> call,
            Metadata headers,
            ServerCallHandler<ReqT, RespT> next
    ) {
        String serviceSecret = headers.get(SERVICE_SECRET_KEY);
        if (!grpcAuthProperties.getServiceSecret().equals(serviceSecret)) {
            call.close(Status.UNAUTHENTICATED.withDescription("Invalid service authentication"), new Metadata());
            return new ServerCall.Listener<>() {
            };
        }

        String correlationId = headers.get(CORRELATION_ID_KEY);
        if (correlationId == null || correlationId.isBlank()) {
            correlationId = UUID.randomUUID().toString();
        }
        String userId = headers.get(USER_ID_KEY);

        log.info("Incoming gRPC call. method={}, correlationId={}", call.getMethodDescriptor().getFullMethodName(), correlationId);

        Context context = Context.current()
                .withValue(GrpcContextKeys.CORRELATION_ID, correlationId)
                .withValue(GrpcContextKeys.USER_ID, userId == null ? "" : userId);
        return Contexts.interceptCall(context, call, headers, next);
    }
}
