package com.aiplatform.gateway.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.connection.stream.StreamReadOptions;
import org.springframework.data.redis.connection.ReactiveRedisConnectionFactory;
import org.springframework.data.redis.connection.stream.MapRecord;
import org.springframework.data.redis.connection.stream.ReadOffset;
import org.springframework.data.redis.connection.stream.StreamOffset;
import org.springframework.data.redis.listener.PatternTopic;
import org.springframework.data.redis.listener.ReactiveRedisMessageListenerContainer;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Flux;
import reactor.core.scheduler.Schedulers;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Component
public class ChatRedisSubscriber {

    private static final Logger log = LoggerFactory.getLogger(ChatRedisSubscriber.class);

    private final ReactiveRedisMessageListenerContainer container;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    public ChatRedisSubscriber(
            ReactiveRedisConnectionFactory connectionFactory,
            StringRedisTemplate redisTemplate,
            ObjectMapper objectMapper
    ) {
        this.container = new ReactiveRedisMessageListenerContainer(connectionFactory);
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
    }

    @PreDestroy
    public void shutdown() {
        container.destroy();
    }

    /**
     * Returns a Flux of JSON strings for the given chatroom Redis channel patterns.
     * Clients subscribe to newMessageSent.{chatroomId} and userTyping.{chatroomId}.
     */
    public Flux<String> subscribeToNewMessages(String chatroomId) {
        PatternTopic topic = PatternTopic.of("newMessageSent." + chatroomId);
        return Flux.defer(() -> container.receive(topic))
                .map(message -> {
                    try {
                        Map<String, Object> envelope = Map.of(
                                "type", "newMessage",
                                "chatroomId", chatroomId,
                                "data", objectMapper.readValue(message.getMessage(), Object.class)
                        );
                        return objectMapper.writeValueAsString(envelope);
                    } catch (Exception e) {
                        log.warn("Failed to process newMessageSent event for chatroomId={}", chatroomId, e);
                        return null;
                    }
                })
                .filter(Objects::nonNull)
                .onErrorResume(error -> {
                    log.warn("Redis subscription unavailable for newMessageSent chatroomId={}: {}", chatroomId, error.getMessage());
                    return Flux.empty();
                });
    }

    public Flux<String> subscribeToTyping(String chatroomId) {
        PatternTopic topic = PatternTopic.of("userTyping." + chatroomId);
        return Flux.defer(() -> container.receive(topic))
                .map(message -> {
                    try {
                        Map<String, Object> envelope = Map.of(
                                "type", "typing",
                                "chatroomId", chatroomId,
                                "data", objectMapper.readValue(message.getMessage(), Object.class)
                        );
                        return objectMapper.writeValueAsString(envelope);
                    } catch (Exception e) {
                        log.warn("Failed to process userTyping event for chatroomId={}", chatroomId, e);
                        return null;
                    }
                })
                .filter(Objects::nonNull)
                .onErrorResume(error -> {
                    log.warn("Redis subscription unavailable for userTyping chatroomId={}: {}", chatroomId, error.getMessage());
                    return Flux.empty();
                });
    }

    public Flux<String> subscribeToNewChatroom(String userId) {
        PatternTopic topic = PatternTopic.of("ChatroomCreatedWithMessage." + userId);
        return Flux.defer(() -> container.receive(topic))
                .map(message -> {
                    try {
                        Map<String, Object> envelope = Map.of(
                                "type", "newChatroom",
                                "userId", userId,
                                "data", objectMapper.readValue(message.getMessage(), Object.class)
                        );
                        return objectMapper.writeValueAsString(envelope);
                    } catch (Exception e) {
                        log.warn("Failed to process ChatroomCreatedWithMessage event for userId={}", userId, e);
                        return null;
                    }
                })
                .filter(Objects::nonNull)
                .onErrorResume(error -> {
                    log.warn("Redis subscription unavailable for ChatroomCreatedWithMessage userId={}: {}", userId, error.getMessage());
                    return Flux.empty();
                });
    }

    public Flux<String> subscribeToAiEvents(String chatroomId) {
        PatternTopic chunkTopic = PatternTopic.of("aiChunk." + chatroomId);
        PatternTopic completedTopic = PatternTopic.of("aiCompleted." + chatroomId);
        PatternTopic failedTopic = PatternTopic.of("aiFailed." + chatroomId);
        PatternTopic cancelledTopic = PatternTopic.of("aiCancelled." + chatroomId);

        return Flux.defer(() -> container.receive(chunkTopic, completedTopic, failedTopic, cancelledTopic))
                .map(message -> {
                    try {
                        String channel = message.getChannel();
                        String type;
                        if (channel.startsWith("aiChunk.")) {
                            type = "AI_CHUNK";
                        } else if (channel.startsWith("aiCompleted.")) {
                            type = "AI_COMPLETED";
                        } else if (channel.startsWith("aiFailed.")) {
                            type = "AI_FAILED";
                        } else {
                            type = "AI_CANCELLED";
                        }

                        Map<String, Object> envelope = Map.of(
                                "type", type,
                                "chatroomId", chatroomId,
                                "data", objectMapper.readValue(message.getMessage(), Object.class)
                        );
                        return objectMapper.writeValueAsString(envelope);
                    } catch (Exception e) {
                        log.warn("Failed to process AI event for chatroomId={}", chatroomId, e);
                        return null;
                    }
                })
                .filter(Objects::nonNull)
                .onErrorResume(error -> {
                    log.warn("Redis subscription unavailable for AI events chatroomId={}: {}", chatroomId, error.getMessage());
                    return Flux.empty();
                });
    }

    /**
     * Subscribes to AI streaming chunk events for a specific message.
     * Used by the SSE streaming endpoint.
     */
    public Flux<String> subscribeToAiStream(String chatroomId, String messageId) {
        PatternTopic chunkTopic = PatternTopic.of("aiChunk." + chatroomId);
        PatternTopic completedTopic = PatternTopic.of("aiCompleted." + chatroomId);
        PatternTopic failedTopic = PatternTopic.of("aiFailed." + chatroomId);
        PatternTopic cancelledTopic = PatternTopic.of("aiCancelled." + chatroomId);

        Flux<String> chunkFlux = Flux.defer(() -> container.receive(chunkTopic))
                .map(message -> {
                    try {
                        Map<String, Object> data = objectMapper.readValue(message.getMessage(), new com.fasterxml.jackson.core.type.TypeReference<Map<String, Object>>() {});
                        if (!messageId.equals(data.get("messageId"))) return null;
                        return objectMapper.writeValueAsString(Map.of("type", "AI_CHUNK", "data", data));
                    } catch (Exception e) {
                        return null;
                    }
                })
                .filter(Objects::nonNull);

        Flux<String> terminalFlux = Flux.defer(() -> container
                        .receive(completedTopic, failedTopic, cancelledTopic))
                .map(message -> {
                    try {
                        Map<String, Object> data = objectMapper.readValue(message.getMessage(), new com.fasterxml.jackson.core.type.TypeReference<Map<String, Object>>() {});
                        if (!messageId.equals(data.get("messageId"))) return null;
                        String type = (String) data.getOrDefault("type", "AI_COMPLETED");
                        return objectMapper.writeValueAsString(Map.of("type", type, "data", data));
                    } catch (Exception e) {
                        return null;
                    }
                })
                .filter(Objects::nonNull);

        return Flux.merge(chunkFlux, terminalFlux)
                .onErrorResume(error -> {
                    log.warn("Redis AI stream subscription error: {}", error.getMessage());
                    return Flux.empty();
                });
    }

    /**
     * Subscribes to direct-mode AI execution events from Redis Streams.
     * Stream key format is stream:ai:{executionId}.
     * Includes heartbeats, bounded timeouts, transient error retry, and error reporting.
     */
    public Flux<String> subscribeToAiExecutionStream(String executionId) {
        String streamKey = "stream:ai:" + executionId;
        return Flux.<String>create(sink -> {
                    log.debug("Subscribing to Redis stream: {}", streamKey);
                    String lastSeenRecordId = "0-0";
                    long startTime = System.currentTimeMillis();
                    long lastHeartbeat = startTime;
                    int consecutiveErrors = 0;
                    final int MAX_CONSECUTIVE_ERRORS = 5;
                    final long TIMEOUT_MS = 300_000; // 5 minutes max stream lifetime

                    while (!sink.isCancelled()) {
                        long now = System.currentTimeMillis();
                        if (now - startTime > TIMEOUT_MS) {
                            log.warn("AI execution stream timed out after {}ms for executionId={}", TIMEOUT_MS, executionId);
                            sink.next("{\"event_type\":\"ai.message.failed.v2\",\"request_id\":\"" + executionId
                                    + "\",\"payload\":{\"error\":\"Execution timed out\",\"error_message\":\"Execution timed out\"}}");
                            sink.complete();
                            return;
                        }

                        if (now - lastHeartbeat >= 15_000) {
                            sink.next("{\"event_type\":\"heartbeat\",\"request_id\":\"" + executionId + "\"}");
                            lastHeartbeat = now;
                        }

                        List<MapRecord<String, Object, Object>> records;
                        try {
                            records = redisTemplate.opsForStream().read(
                                    StreamReadOptions.empty().block(Duration.ofSeconds(2)).count(20),
                                    StreamOffset.create(streamKey, ReadOffset.from(lastSeenRecordId))
                            );
                            consecutiveErrors = 0;
                        } catch (Exception ex) {
                            consecutiveErrors++;
                            log.warn("Transient Redis read failure for stream {} (attempt {}/{}): {}",
                                    streamKey, consecutiveErrors, MAX_CONSECUTIVE_ERRORS, ex.getMessage());
                            if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
                                sink.next("{\"event_type\":\"ai.message.failed.v2\",\"request_id\":\"" + executionId
                                        + "\",\"payload\":{\"error\":\"Stream connection lost\",\"error_message\":\"Stream connection lost\"}}");
                                sink.complete();
                                return;
                            }
                            try {
                                Thread.sleep(1000);
                            } catch (InterruptedException ie) {
                                Thread.currentThread().interrupt();
                                return;
                            }
                            continue;
                        }

                        if (records == null || records.isEmpty()) {
                            continue;
                        }

                        for (MapRecord<String, Object, Object> record : records) {
                            String currentRecordId = record.getId().getValue();
                            if (lastSeenRecordId.equals(currentRecordId)) {
                                continue;
                            }
                            lastSeenRecordId = currentRecordId;

                            ExecutionStreamEvent event = toExecutionEvent(record);
                            if (event == null) {
                                continue;
                            }

                            sink.next(event.eventJson());
                            lastHeartbeat = System.currentTimeMillis();
                            if (event.terminal()) {
                                sink.complete();
                                return;
                            }
                        }
                    }
                })
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorResume(error -> {
                    log.warn("Redis stream subscription unavailable for executionId={}: {}", executionId, error.getMessage());
                    return Flux.just("{\"event_type\":\"ai.message.failed.v2\",\"request_id\":\"" + executionId
                            + "\",\"payload\":{\"error\":\"Stream unavailable\",\"error_message\":\"Stream unavailable\"}}");
                });
    }

    private ExecutionStreamEvent toExecutionEvent(
            MapRecord<String, Object, Object> record
    ) {
        try {
            Object rawEvent = record.getValue().get("event");
            if (rawEvent != null) {
                String eventJson = String.valueOf(rawEvent);
                JsonNode node = objectMapper.readTree(eventJson);
                String eventType = node.path("event_type").asText("");

                log.debug("Received Redis event type: {}", eventType);

                String sseEvent = toSseEventName(eventType);
                boolean terminal = isTerminalEvent(sseEvent);

                return new ExecutionStreamEvent(eventJson, sseEvent, terminal);
            }

            String eventType = asString(record.getValue().get("event_type"));
            if (eventType == null || eventType.isBlank()) {
                return null;
            }

            String payloadRaw = asString(record.getValue().get("payload"));
            JsonNode payloadNode = (payloadRaw == null || payloadRaw.isBlank())
                    ? objectMapper.createObjectNode()
                    : objectMapper.readTree(payloadRaw);

            // Ensure both error and error_message are populated for failed events
            if (payloadNode.isObject() && "ai.message.failed.v2".equals(eventType)) {
                ObjectNode pObj = (ObjectNode) payloadNode;
                if (pObj.has("error") && !pObj.has("error_message")) {
                    pObj.put("error_message", pObj.get("error").asText());
                } else if (pObj.has("error_message") && !pObj.has("error")) {
                    pObj.put("error", pObj.get("error_message").asText());
                }
            }

            ObjectNode eventNode = objectMapper.createObjectNode();
            eventNode.put("event_type", eventType);
            putIfPresent(eventNode, "request_id", record.getValue().get("request_id"));
            putIfPresent(eventNode, "message_id", record.getValue().get("message_id"));
            putIfPresent(eventNode, "sequence", record.getValue().get("sequence"));
            putIfPresent(eventNode, "ts", record.getValue().get("ts"));
            eventNode.set("payload", payloadNode);

            String eventJson = objectMapper.writeValueAsString(eventNode);
            log.debug("Received Redis stream event type: {}", eventType);

            String sseEvent = toSseEventName(eventType);
            boolean terminal = isTerminalEvent(sseEvent);

            return new ExecutionStreamEvent(eventJson, sseEvent, terminal);
        } catch (Exception e) {
            log.warn("Failed to process Redis stream AI event", e);
            return null;
        }
    }

    private String toSseEventName(String eventType) {
        switch (eventType) {
            case "ai.message.chunk.v2":
                return "ai_chunk";
            case "ai.message.completed.v2":
                return "ai_completed";
            case "ai.message.failed.v2":
                return "ai_failed";
            case "ai.message.cancelled.v2":
                return "ai_cancelled";
            default:
                return "ai_event";
        }
    }

    private boolean isTerminalEvent(String sseEvent) {
        return "ai_completed".equals(sseEvent)
                || "ai_failed".equals(sseEvent)
                || "ai_cancelled".equals(sseEvent);
    }

    private String asString(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private void putIfPresent(ObjectNode node, String fieldName, Object value) {
        if (value != null) {
            node.put(fieldName, String.valueOf(value));
        }
    }

    public record ExecutionStreamEvent(String eventJson, String sseEvent, boolean terminal) {
    }
}
