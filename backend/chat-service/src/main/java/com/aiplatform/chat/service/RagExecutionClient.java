package com.aiplatform.chat.service;

import com.aiplatform.chat.config.GrpcRagClientProperties;
import com.aiplatform.chat.domain.MessageEntity;
import com.aiplatform.rag.proto.ExecuteDirectRequest;
import com.aiplatform.rag.proto.ExecutionMode;
import com.aiplatform.rag.proto.RagServiceGrpc;
import io.grpc.Metadata;
import io.grpc.stub.MetadataUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.devh.boot.grpc.client.inject.GrpcClient;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class RagExecutionClient {

    private static final Metadata.Key<String> CORRELATION_ID_KEY = Metadata.Key.of("x-correlation-id", Metadata.ASCII_STRING_MARSHALLER);
    private static final Metadata.Key<String> SERVICE_SECRET_KEY = Metadata.Key.of("x-service-secret", Metadata.ASCII_STRING_MARSHALLER);
    private static final Metadata.Key<String> USER_ID_KEY = Metadata.Key.of("x-user-id", Metadata.ASCII_STRING_MARSHALLER);

    @GrpcClient("rag-service")
    private RagServiceGrpc.RagServiceBlockingStub ragStub;

    private final GrpcRagClientProperties grpcRagClientProperties;

    public void executeChat(MessageEntity message, String correlationId) {
        if (message.getAiModelId() == null || message.getAiModelId().isBlank()) {
            return;
        }

        ExecuteDirectRequest request = ExecuteDirectRequest.newBuilder()
                .setRequestId(message.getId().toString())
                .setUserId(message.getSenderUserId().toString())
                .setPrompt(message.getContent() != null ? message.getContent() : "")
                .setAiModelId(message.getAiModelId())
                .setMode(ExecutionMode.CHAT)
                .setChatroomId(message.getChatroomId().toString())
                .setMessageId(message.getId().toString())
                .build();

        var response = withMetadata(message.getSenderUserId().toString(), correlationId).executeDirect(request);
        log.info("Submitted chat AI execution requestId={} streamKey={}", response.getRequestId(), response.getStreamKey());
    }

    private RagServiceGrpc.RagServiceBlockingStub withMetadata(String userId, String correlationId) {
        Metadata metadata = new Metadata();
        metadata.put(CORRELATION_ID_KEY, correlationId != null && !correlationId.isBlank() ? correlationId : java.util.UUID.randomUUID().toString());
        metadata.put(SERVICE_SECRET_KEY, grpcRagClientProperties.serviceSecret());
        metadata.put(USER_ID_KEY, userId);
        return ragStub.withInterceptors(MetadataUtils.newAttachHeadersInterceptor(metadata));
    }
}
