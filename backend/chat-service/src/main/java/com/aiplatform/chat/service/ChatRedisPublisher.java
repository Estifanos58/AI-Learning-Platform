package com.aiplatform.chat.service;

import com.aiplatform.chat.domain.MessageEntity;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatRedisPublisher {

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    public void publishNewChatroomWithMessage(MessageEntity message, UUID subscriberUserId, UUID otherUserId) {
        String channel = "ChatroomCreatedWithMessage." + subscriberUserId;
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

    // ── RAG streaming events ──────────────────────────────────────────────────

    public void publishAiChunk(String chatroomId, String messageId, int sequence, String contentDelta, boolean done) {
        String channel = "aiChunk." + chatroomId;
        Map<String, Object> payload = Map.of(
                "type", "AI_CHUNK",
                "chatroomId", chatroomId,
                "messageId", messageId,
                "sequence", sequence,
                "contentDelta", contentDelta,
                "done", done
        );
        publish(channel, payload);
    }

    public void publishAiCompleted(String chatroomId, String messageId, String finalContent) {
        String channel = "aiCompleted." + chatroomId;
        Map<String, Object> payload = Map.of(
                "type", "AI_COMPLETED",
                "chatroomId", chatroomId,
                "messageId", messageId,
                "finalContent", finalContent
        );
        publish(channel, payload);
    }

    public void publishAiFailed(String chatroomId, String messageId, String error) {
        String channel = "aiFailed." + chatroomId;
        Map<String, Object> payload = Map.of(
                "type", "AI_FAILED",
                "chatroomId", chatroomId,
                "messageId", messageId,
                "error", error
        );
        publish(channel, payload);
    }

    public void publishAiCancelled(String chatroomId, String messageId) {
        String channel = "aiCancelled." + chatroomId;
        Map<String, Object> payload = Map.of(
                "type", "AI_CANCELLED",
                "chatroomId", chatroomId,
                "messageId", messageId
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
        LocalDateTime createdAt = message.getCreatedAt() != null ? message.getCreatedAt() : LocalDateTime.now();
        return Map.of(
                "id", message.getId().toString(),
                "chatroomId", message.getChatroomId().toString(),
                "senderUserId", message.getSenderUserId().toString(),
                "aiModelId", message.getAiModelId() != null ? message.getAiModelId() : "",
                "content", message.getContent() != null ? message.getContent() : "",
                "fileId", message.getFileId() != null ? message.getFileId().toString() : "",
                "createdAt", createdAt.toString()
        );
    }
}
