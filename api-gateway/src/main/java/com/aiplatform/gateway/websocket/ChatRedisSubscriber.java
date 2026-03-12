package com.aiplatform.gateway.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.connection.ReactiveRedisConnectionFactory;
import org.springframework.data.redis.listener.PatternTopic;
import org.springframework.data.redis.listener.ReactiveRedisMessageListenerContainer;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.socket.WebSocketSession;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.Map;
import java.util.Objects;

@Slf4j
@Component
public class ChatRedisSubscriber {

    private final ReactiveRedisConnectionFactory connectionFactory;
    private final ObjectMapper objectMapper;

    public ChatRedisSubscriber(ReactiveRedisConnectionFactory connectionFactory, ObjectMapper objectMapper) {
        this.connectionFactory = connectionFactory;
        this.objectMapper = objectMapper;
    }

    private ReactiveRedisMessageListenerContainer createContainer() {
        return new ReactiveRedisMessageListenerContainer(connectionFactory);
    }

    /**
     * Returns a Flux of JSON strings for the given chatroom Redis channel patterns.
     * Clients subscribe to newMessageSent.{chatroomId} and userTyping.{chatroomId}.
     */
    public Flux<String> subscribeToNewMessages(String chatroomId) {
        PatternTopic topic = PatternTopic.of("newMessageSent." + chatroomId);
        return Flux.defer(() -> createContainer().receive(topic))
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
        return Flux.defer(() -> createContainer().receive(topic))
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
        return Flux.defer(() -> createContainer().receive(topic))
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

    /**
     * Subscribes to AI streaming chunk events for a specific message.
     * Used by the SSE streaming endpoint.
     */
    public Flux<String> subscribeToAiStream(String chatroomId, String messageId) {
        PatternTopic chunkTopic = PatternTopic.of("aiChunk." + chatroomId);
        PatternTopic completedTopic = PatternTopic.of("aiCompleted." + chatroomId);
        PatternTopic failedTopic = PatternTopic.of("aiFailed." + chatroomId);
        PatternTopic cancelledTopic = PatternTopic.of("aiCancelled." + chatroomId);

        Flux<String> chunkFlux = Flux.defer(() -> createContainer().receive(chunkTopic))
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

        Flux<String> terminalFlux = Flux.defer(() -> createContainer()
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
