package com.aiplatform.chat.service;

import com.aiplatform.chat.config.KafkaChatTopicProperties;
import com.aiplatform.chat.domain.MessageEntity;
import com.aiplatform.chat.domain.OutboxEvent;
import com.aiplatform.chat.repository.MessageRepository;
import com.aiplatform.chat.repository.OutboxEventRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatKafkaPublisher {

    private final OutboxEventRepository outboxEventRepository;
    private final KafkaChatTopicProperties topicProperties;
    private final ObjectMapper objectMapper;
    private final MessageRepository messageRepository;

    public void publishAiMessageRequested(MessageEntity message) {
        if (message.getAiModelId() == null || message.getAiModelId().isBlank()) {
            return;
        }
        String v2Topic = topicProperties.aiMessageV2Topic();
        if (v2Topic == null || v2Topic.isBlank()) {
            return;
        }

        List<String> fileIds = new ArrayList<>();
        if (message.getFileId() != null) {
            fileIds.add(message.getFileId().toString());
        }

        List<Map<String, Object>> contextWindow = buildContextWindow(message);

        Map<String, Object> payload = Map.of(
                "event_id", UUID.randomUUID().toString(),
                "event_type", "ai.message.requested.v2",
                "timestamp", Instant.now().toString(),
                "payload", Map.of(
                        "chatroom_id", message.getChatroomId().toString(),
                        "message_id", message.getId().toString(),
                        "user_id", message.getSenderUserId().toString(),
                        "ai_model_id", message.getAiModelId(),
                        "content", message.getContent() != null ? message.getContent() : "",
                        "file_ids", fileIds,
                        "context_window", contextWindow,
                        "options", Map.of(
                                "max_tokens", 2048,
                                "temperature", 0.2,
                                "stream", true
                        )
                )
        );
        try {
            String json = objectMapper.writeValueAsString(payload);
            enqueueOutbox(v2Topic, message.getChatroomId().toString(), json);
            log.info("Queued ai.message.requested.v2 outbox event. messageId={}", message.getId());
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize AI message v2 event", e);
        }
    }

    private List<Map<String, Object>> buildContextWindow(MessageEntity message) {
        if (message.getChatroomId() == null || message.getId() == null) {
            return List.of();
        }

        List<MessageEntity> previousMessages = messageRepository
                .findTop5ByChatroomIdAndIdNotOrderByCreatedAtDesc(message.getChatroomId(), message.getId());
        if (previousMessages.isEmpty()) {
            return List.of();
        }

        Collections.reverse(previousMessages);
        List<Map<String, Object>> contextWindow = new ArrayList<>();
        for (MessageEntity item : previousMessages) {
            if (item.getContent() == null || item.getContent().isBlank()) {
                continue;
            }

            String role = (item.getAiModelId() != null && !item.getAiModelId().isBlank()) ? "assistant" : "user";
            String senderName = item.getSenderUserId() != null ? item.getSenderUserId().toString() : "unknown";
            String uploadedAt = item.getCreatedAt() != null ? item.getCreatedAt().toString() : "";
            String chunkText = "Sender: " + senderName + "\nUploadedAt: " + uploadedAt + "\nContent: " + item.getContent();

            contextWindow.add(Map.of(
                    "role", role,
                    "content", chunkText,
                    "sender_name", senderName,
                    "uploaded_at", uploadedAt
            ));
        }
        return contextWindow;
    }

    public void publishCancellation(String chatroomId, String messageId, String userId) {
        String topic = topicProperties.aiMessageCancelledTopic();
        if (topic == null || topic.isBlank()) {
            return;
        }
        Map<String, Object> payload = Map.of(
                "event_id", UUID.randomUUID().toString(),
                "event_type", "ai.message.cancelled.v2",
                "timestamp", Instant.now().toString(),
                "payload", Map.of(
                        "chatroom_id", chatroomId,
                        "message_id", messageId,
                        "request_id", messageId,
                        "user_id", userId
                )
        );
        try {
            String json = objectMapper.writeValueAsString(payload);
            enqueueOutbox(topic, chatroomId, json);
            log.info("Queued ai.message.cancelled.v2 outbox event. messageId={}", messageId);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize cancellation event", e);
        }
    }

    private void enqueueOutbox(String topic, String eventKey, String json) {
        LocalDateTime now = LocalDateTime.now();
        String correlationId = MDC.get("correlationId");
        outboxEventRepository.save(OutboxEvent.builder()
                .id(UUID.randomUUID())
                .topic(topic)
                .eventKey(eventKey)
                .payload(json)
                .headersJson(correlationId == null ? "" : correlationId)
                .status("PENDING")
                .retryCount(0)
                .nextAttemptAt(now)
                .createdAt(now)
                .build());
    }
}
