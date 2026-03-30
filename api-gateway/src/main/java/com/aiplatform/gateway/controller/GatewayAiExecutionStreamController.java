package com.aiplatform.gateway.controller;

import com.aiplatform.gateway.websocket.ChatRedisSubscriber;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.server.reactive.ServerHttpResponse;
import reactor.core.publisher.Flux;

@RestController
@RequestMapping("/api/internal/ai")
public class GatewayAiExecutionStreamController {

    private static final Logger log = LoggerFactory.getLogger(GatewayAiExecutionStreamController.class);

    private final ChatRedisSubscriber redisSubscriber;
    private final ObjectMapper objectMapper;

    public GatewayAiExecutionStreamController(ChatRedisSubscriber redisSubscriber, ObjectMapper objectMapper) {
        this.redisSubscriber = redisSubscriber;
        this.objectMapper = objectMapper;
    }

    @GetMapping(value = "/executions/{executionId}/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<String>> streamExecution(
            @PathVariable String executionId,
            ServerHttpResponse response
    ) {
        log.info("SSE stream started for executionId={}", executionId);
        response.getHeaders().setCacheControl("no-cache");
        response.getHeaders().set("X-Accel-Buffering", "no");

        return redisSubscriber.subscribeToAiExecutionStream(executionId)
                .map(eventJson -> {
                    String sseEvent = toSseEvent(eventJson);
                    log.info("Forwarding SSE event: {}", sseEvent);
                    return ServerSentEvent.builder(eventJson)
                            .event(sseEvent)
                            .build();
                });
    }

    private String toSseEvent(String eventJson) {
        try {
            JsonNode node = objectMapper.readTree(eventJson);
            String eventType = node.get("event_type").asText();

            return switch (eventType) {
                case "ai.message.chunk.v2" -> "ai_chunk";
                case "ai.message.completed.v2" -> "ai_completed";
                case "ai.message.failed.v2" -> "ai_failed";
                case "ai.message.cancelled.v2" -> "ai_cancelled";
                default -> "ai_event";
            };
        } catch (Exception ignored) {
            return "ai_event";
        }
    }
}
