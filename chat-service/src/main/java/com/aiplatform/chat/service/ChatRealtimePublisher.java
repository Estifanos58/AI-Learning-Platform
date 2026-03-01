package com.aiplatform.chat.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class ChatRealtimePublisher {

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    public void publishChatroomCreated(UUID chatroomId, UUID createdById, String correlationId) {
        publish(
                "chatroom.created." + chatroomId,
                Map.of(
                        "chatroomId", chatroomId.toString(),
                        "createdById", createdById.toString(),
                        "timestamp", LocalDateTime.now().toString(),
                        "correlationId", normalize(correlationId)
                ),
                correlationId
        );
    }

    public void publishMessageSent(UUID chatroomId, UUID messageId, UUID userId, String content, String correlationId) {
        publish(
                "chat.message." + chatroomId,
                Map.of(
                        "chatroomId", chatroomId.toString(),
                        "messageId", messageId.toString(),
                        "userId", userId.toString(),
                        "content", normalize(content),
                        "timestamp", LocalDateTime.now().toString(),
                        "correlationId", normalize(correlationId)
                ),
                correlationId
        );
    }

    public void publishTyping(UUID chatroomId, UUID userId, boolean typing, String correlationId) {
        publish(
                "chat.typing." + chatroomId,
                Map.of(
                        "chatroomId", chatroomId.toString(),
                        "userId", userId.toString(),
                        "typing", typing,
                        "timestamp", LocalDateTime.now().toString(),
                        "correlationId", normalize(correlationId)
                ),
                correlationId
        );
    }

    private void publish(String channel, Map<String, Object> payload, String correlationId) {
        try {
            redisTemplate.convertAndSend(channel, objectMapper.writeValueAsString(payload));
        } catch (JsonProcessingException exception) {
            log.error("Failed to serialize Redis payload. channel={}, correlationId={}", channel, correlationId, exception);
        } catch (Exception exception) {
            log.error("Failed Redis publish. channel={}, correlationId={}", channel, correlationId, exception);
        }
    }

    private String normalize(String value) {
        return value == null ? "" : value;
    }
}
