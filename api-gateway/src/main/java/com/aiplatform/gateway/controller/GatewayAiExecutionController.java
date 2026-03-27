package com.aiplatform.gateway.controller;

import com.aiplatform.gateway.config.GrpcRagProperties;
import com.aiplatform.gateway.dto.StartAiExecutionRequest;
import com.aiplatform.gateway.dto.StartAiExecutionResponse;
import com.aiplatform.gateway.security.JwtValidationService;
import com.aiplatform.gateway.util.GatewayPrincipal;
import com.aiplatform.gateway.util.GatewayPrincipalResolver;
import com.aiplatform.gateway.util.GrpcExceptionMapper;
import com.aiplatform.rag.proto.ExecuteAcceptedResponse;
import com.aiplatform.rag.proto.ExecuteDirectRequest;
import com.aiplatform.rag.proto.ExecutionMode;
import com.aiplatform.rag.proto.RagServiceGrpc;
import io.grpc.Metadata;
import io.grpc.stub.MetadataUtils;
import jakarta.validation.Valid;
import net.devh.boot.grpc.client.inject.GrpcClient;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.util.UUID;

@RestController
@RequestMapping("/api/internal/ai")
public class GatewayAiExecutionController {

    private static final Metadata.Key<String> CORRELATION_ID_KEY = Metadata.Key.of("x-correlation-id", Metadata.ASCII_STRING_MARSHALLER);
    private static final Metadata.Key<String> SERVICE_SECRET_KEY = Metadata.Key.of("x-service-secret", Metadata.ASCII_STRING_MARSHALLER);
    private static final Metadata.Key<String> USER_ID_KEY = Metadata.Key.of("x-user-id", Metadata.ASCII_STRING_MARSHALLER);

    @GrpcClient("rag-service")
    private RagServiceGrpc.RagServiceBlockingStub ragStub;

    private final GrpcRagProperties grpcRagProperties;
    private final JwtValidationService jwtValidationService;

    public GatewayAiExecutionController(GrpcRagProperties grpcRagProperties, JwtValidationService jwtValidationService) {
        this.grpcRagProperties = grpcRagProperties;
        this.jwtValidationService = jwtValidationService;
    }

    @PostMapping("/executions")
    public Mono<ResponseEntity<StartAiExecutionResponse>> execute(
            @Valid @RequestBody StartAiExecutionRequest request,
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader
    ) {
        return Mono.fromCallable(() -> {
                    GatewayPrincipal principal = resolvePrincipal(authorization, correlationHeader);
                    ExecuteDirectRequest.Builder grpcRequest = ExecuteDirectRequest.newBuilder()
                            .setRequestId((request.requestId() == null || request.requestId().isBlank()) ? UUID.randomUUID().toString() : request.requestId())
                            .setUserId(principal.userId())
                            .setPrompt(request.prompt())
                            .setMode(toMode(request.mode()));

                    if (request.aiModelId() != null) {
                        grpcRequest.setAiModelId(request.aiModelId());
                    }
                    if (request.fileIds() != null && !request.fileIds().isEmpty()) {
                        grpcRequest.addAllFileIds(request.fileIds());
                    }
                    if (request.chatroomId() != null) {
                        grpcRequest.setChatroomId(request.chatroomId());
                    }
                    if (request.messageId() != null) {
                        grpcRequest.setMessageId(request.messageId());
                    }
                    if (request.options() != null && !request.options().isEmpty()) {
                        grpcRequest.putAllOptions(request.options());
                    }

                    ExecuteAcceptedResponse response = withMetadata(principal).executeDirect(grpcRequest.build());
                    return ResponseEntity.accepted().body(new StartAiExecutionResponse(
                            response.getStatus(),
                            response.getRequestId(),
                            response.getStreamKey(),
                            response.getAccepted()
                    ));
                })
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorMap(GrpcExceptionMapper::toResponseStatus);
    }

    private ExecutionMode toMode(String mode) {
        if (mode == null || mode.isBlank()) {
            return ExecutionMode.DEEP;
        }
        return "chat".equalsIgnoreCase(mode) ? ExecutionMode.CHAT : ExecutionMode.DEEP;
    }

    private RagServiceGrpc.RagServiceBlockingStub withMetadata(GatewayPrincipal principal) {
        Metadata metadata = new Metadata();
        metadata.put(CORRELATION_ID_KEY, principal.correlationId());
        metadata.put(SERVICE_SECRET_KEY, grpcRagProperties.getServiceSecret());
        metadata.put(USER_ID_KEY, principal.userId());
        return ragStub.withInterceptors(MetadataUtils.newAttachHeadersInterceptor(metadata));
    }

    private GatewayPrincipal resolvePrincipal(String authorization, String correlationHeader) {
        return GatewayPrincipalResolver.resolve(authorization, correlationHeader, jwtValidationService);
    }
}
