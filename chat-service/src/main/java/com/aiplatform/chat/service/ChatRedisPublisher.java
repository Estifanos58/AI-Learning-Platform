package com.aiplatform.chat.service;

import com.aiplatform.chat.domain.MessageEntity;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatRedisPublisher {

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    public void publishNewChatroomWithMessage(MessageEntity message, UUID otherUserId) {
        String channel = "ChatroomCreatedWithMessage." + otherUserId;
        Map<String, Object> payload = Map.of(
                "message", messageToMap(message),
                "chatroomId", message.getChatroomId().toString(),
                "otherUserId", otherUserId.toString(),
                "userId", message.getSenderUserId().toString(),
                "fileId", message.getFileId() != null ? message.getFileId().toString() : ""
        );
        publish(channel, payload);
    }

    public void publishNewMessage(MessageEntity message) {
        String channel = "newMessageSent." + message.getChatroomId();
        Map<String, Object> payload = Map.of(
                "message", messageToMap(message),
                "chatroomId", message.getChatroomId().toString(),
                "userId", message.getSenderUserId().toString(),
                "fileId", message.getFileId() != null ? message.getFileId().toString() : ""
        );
        publish(channel, payload);
    }

    public void publishTypingIndicator(UUID userId, UUID chatroomId, boolean isTyping) {
        String channel = "userTyping." + chatroomId;
        Map<String, Object> payload = Map.of(
                "userId", userId.toString(),
                "chatroomId", chatroomId.toString(),
                "isTyping", isTyping
        );
        publish(channel, payload);
    }

    private void publish(String channel, Object payload) {
        try {
            String json = objectMapper.writeValueAsString(payload);
            redisTemplate.convertAndSend(channel, json);
            log.debug("Published to Redis channel={}.", channel);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize Redis message for channel={}", channel, e);
        }
    }

    private Map<String, Object> messageToMap(MessageEntity message) {
        return Map.of(
                "id", message.getId().toString(),
                "chatroomId", message.getChatroomId().toString(),
                "senderUserId", message.getSenderUserId().toString(),
                "aiModelId", message.getAiModelId() != null ? message.getAiModelId() : "",
                "content", message.getContent() != null ? message.getContent() : "",
                "fileId", message.getFileId() != null ? message.getFileId().toString() : "",
                "createdAt", message.getCreatedAt().toString()
        );
    }
}
