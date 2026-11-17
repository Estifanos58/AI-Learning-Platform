package com.aiplatform.gateway.controller;

import com.aiplatform.gateway.config.GrpcRagProperties;
import com.aiplatform.gateway.security.JwtValidationService;
import com.aiplatform.gateway.util.GatewayPrincipal;
import com.aiplatform.gateway.util.GatewayPrincipalResolver;
import com.aiplatform.gateway.websocket.ChatRedisSubscriber;
import com.aiplatform.rag.proto.GetExecutionRequest;
import com.aiplatform.rag.proto.GetExecutionResponse;
import com.aiplatform.rag.proto.RagServiceGrpc;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.grpc.Metadata;
import io.grpc.stub.MetadataUtils;
import net.devh.boot.grpc.client.inject.GrpcClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Flux;

@RestController
@RequestMapping("/api/internal/ai")
public class GatewayAiExecutionStreamController {

    private static final Logger log = LoggerFactory.getLogger(GatewayAiExecutionStreamController.class);

    private static final Metadata.Key<String> CORRELATION_ID_KEY = Metadata.Key.of("x-correlation-id", Metadata.ASCII_STRING_MARSHALLER);
    private static final Metadata.Key<String> SERVICE_SECRET_KEY = Metadata.Key.of("x-service-secret", Metadata.ASCII_STRING_MARSHALLER);
    private static final Metadata.Key<String> USER_ID_KEY = Metadata.Key.of("x-user-id", Metadata.ASCII_STRING_MARSHALLER);

    @GrpcClient("rag-service")
    private RagServiceGrpc.RagServiceBlockingStub ragStub;

    private final ChatRedisSubscriber redisSubscriber;
    private final ObjectMapper objectMapper;
    private final GrpcRagProperties grpcRagProperties;
    private final JwtValidationService jwtValidationService;

    public GatewayAiExecutionStreamController(
            ChatRedisSubscriber redisSubscriber,
            ObjectMapper objectMapper,
            GrpcRagProperties grpcRagProperties,
            JwtValidationService jwtValidationService
    ) {
        this.redisSubscriber = redisSubscriber;
        this.objectMapper = objectMapper;
        this.grpcRagProperties = grpcRagProperties;
        this.jwtValidationService = jwtValidationService;
    }

    @GetMapping(value = "/executions/{executionId}/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<String>> streamExecution(
            @PathVariable String executionId,
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @RequestParam(value = "token", required = false) String tokenParam,
            @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader,
            ServerHttpResponse response
    ) {
        String effectiveAuth = authorization;
        if ((effectiveAuth == null || !effectiveAuth.startsWith("Bearer ")) && tokenParam != null && !tokenParam.isBlank()) {
            effectiveAuth = "Bearer " + tokenParam.trim();
        }

        GatewayPrincipal principal;
        try {
            principal = GatewayPrincipalResolver.resolve(effectiveAuth, correlationHeader, jwtValidationService);
        } catch (Exception e) {
            return Flux.error(new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required to stream execution", e));
        }

        // Enforce ownership authorization before allowing SSE stream
        try {
            Metadata metadata = new Metadata();
            metadata.put(CORRELATION_ID_KEY, principal.correlationId());
            metadata.put(SERVICE_SECRET_KEY, grpcRagProperties.getServiceSecret());
            metadata.put(USER_ID_KEY, principal.userId());

            GetExecutionResponse execution = ragStub.withInterceptors(MetadataUtils.newAttachHeadersInterceptor(metadata))
                    .getExecution(GetExecutionRequest.newBuilder().setExecutionId(executionId).build());

            if (execution == null) {
                return Flux.error(new ResponseStatusException(HttpStatus.NOT_FOUND, "Execution not found"));
            }
        } catch (Exception e) {
            log.warn("Unauthorized execution stream request. executionId={}, userId={}, error={}",
                    executionId, principal.userId(), e.getMessage());
            return Flux.error(new ResponseStatusException(HttpStatus.FORBIDDEN, "User is not authorized to stream this execution", e));
        }

        log.info("SSE stream authorized and started for executionId={}, userId={}", executionId, principal.userId());
        response.getHeaders().setCacheControl("no-cache");
        response.getHeaders().set("X-Accel-Buffering", "no");

        return redisSubscriber.subscribeToAiExecutionStream(executionId)
                .map(eventJson -> {
                    String sseEvent = toSseEvent(eventJson);
                    log.debug("Forwarding SSE event: {}", sseEvent);
                    return ServerSentEvent.builder(eventJson)
                            .event(sseEvent)
                            .build();
                });
    }

    private String toSseEvent(String eventJson) {
        try {
            JsonNode node = objectMapper.readTree(eventJson);
            String eventType = node.path("event_type").asText("");

            return switch (eventType) {
                case "ai.message.chunk.v2" -> "ai_chunk";
                case "ai.message.completed.v2" -> "ai_completed";
                case "ai.message.failed.v2" -> "ai_failed";
                case "ai.message.cancelled.v2" -> "ai_cancelled";
                case "heartbeat" -> "heartbeat";
                default -> "ai_event";
            };
        } catch (Exception ignored) {
            return "ai_event";
        }
    }
}
