package com.aiplatform.chat.grpc;

import com.aiplatform.chat.config.GrpcChatProperties;
import io.grpc.Context;
import io.grpc.Contexts;
import io.grpc.Metadata;
import io.grpc.ServerCall;
import io.grpc.ServerCallHandler;
import io.grpc.ServerInterceptor;
import io.grpc.Status;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.devh.boot.grpc.server.interceptor.GrpcGlobalServerInterceptor;
import org.springframework.stereotype.Component;

import java.util.Objects;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
@GrpcGlobalServerInterceptor
public class GrpcChatServerInterceptor implements ServerInterceptor {

    private static final Metadata.Key<String> CORRELATION_ID_KEY = Metadata.Key.of(GrpcMetadataConstants.CORRELATION_ID_HEADER, Metadata.ASCII_STRING_MARSHALLER);
    private static final Metadata.Key<String> SERVICE_SECRET_KEY = Metadata.Key.of(GrpcMetadataConstants.SERVICE_SECRET_HEADER, Metadata.ASCII_STRING_MARSHALLER);
    private static final Metadata.Key<String> USER_ID_KEY = Metadata.Key.of(GrpcMetadataConstants.USER_ID_HEADER, Metadata.ASCII_STRING_MARSHALLER);
    private static final Metadata.Key<String> USER_ROLES_KEY = Metadata.Key.of(GrpcMetadataConstants.USER_ROLES_HEADER, Metadata.ASCII_STRING_MARSHALLER);
    private static final Metadata.Key<String> UNIVERSITY_ID_KEY = Metadata.Key.of(GrpcMetadataConstants.UNIVERSITY_ID_HEADER, Metadata.ASCII_STRING_MARSHALLER);

    private final GrpcChatProperties grpcChatProperties;

    @Override
    public <ReqT, RespT> ServerCall.Listener<ReqT> interceptCall(
            ServerCall<ReqT, RespT> call,
            Metadata headers,
            ServerCallHandler<ReqT, RespT> next
    ) {
        String serviceSecret = headers.get(SERVICE_SECRET_KEY);
        if (!Objects.equals(grpcChatProperties.serviceSecret(), serviceSecret)) {
            call.close(Status.UNAUTHENTICATED.withDescription("Invalid service authentication"), new Metadata());
            return new ServerCall.Listener<>() {
            };
        }

        String correlationId = headers.get(CORRELATION_ID_KEY);
        if (correlationId == null || correlationId.isBlank()) {
            correlationId = UUID.randomUUID().toString();
        }

        String userId = headers.get(USER_ID_KEY);
        String userRoles = headers.get(USER_ROLES_KEY);
        String universityId = headers.get(UNIVERSITY_ID_KEY);

        log.info("Incoming gRPC call. method={}, correlationId={}, userId={}",
                call.getMethodDescriptor().getFullMethodName(), correlationId, userId);

        Context context = Context.current()
                .withValue(GrpcContextKeys.CORRELATION_ID, correlationId)
                .withValue(GrpcContextKeys.USER_ID, userId)
                .withValue(GrpcContextKeys.USER_ROLES, userRoles)
                .withValue(GrpcContextKeys.UNIVERSITY_ID, universityId);

        return Contexts.interceptCall(context, call, headers, next);
    }
}
