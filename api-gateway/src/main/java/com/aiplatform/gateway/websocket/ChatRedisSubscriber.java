package com.aiplatform.gateway.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.connection.ReactiveRedisConnectionFactory;
import org.springframework.data.redis.listener.PatternTopic;
import org.springframework.data.redis.listener.ReactiveRedisMessageListenerContainer;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Flux;

import java.util.Map;
import java.util.Objects;

@Slf4j
@Component
public class ChatRedisSubscriber {

    private final ReactiveRedisMessageListenerContainer container;
    private final ObjectMapper objectMapper;

    public ChatRedisSubscriber(ReactiveRedisConnectionFactory connectionFactory, ObjectMapper objectMapper) {
        this.container = new ReactiveRedisMessageListenerContainer(connectionFactory);
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
                        String channel = new String(message.getChannel());
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
}
