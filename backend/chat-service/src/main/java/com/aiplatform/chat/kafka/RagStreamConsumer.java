package com.aiplatform.chat.kafka;

import com.aiplatform.chat.service.ChatRedisPublisher;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Consumes RAG streaming response events and relays them to Redis
 * for WebSocket delivery to connected clients.
 * Exceptions propagate to the container's DefaultErrorHandler + DeadLetterPublishingRecoverer,
 * ensuring offsets are only committed after successful handling or confirmed DLT delivery.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RagStreamConsumer {

    private final ChatRedisPublisher redisPublisher;
    private final ObjectMapper objectMapper;

    @KafkaListener(
            topics = {
                "${app.kafka.chat.ai-message-chunk-topic:ai.message.chunk.v2}",
                "${app.kafka.chat.ai-message-completed-topic:ai.message.completed.v2}",
                "${app.kafka.chat.ai-message-failed-topic:ai.message.failed.v2}",
                "${app.kafka.chat.ai-message-cancelled-topic:ai.message.cancelled.v2}"
            },
            groupId = "${spring.kafka.consumer.group-id:chat-service-rag-v2}",
            containerFactory = "ragStreamKafkaListenerContainerFactory"
    )
    public void onRagEvent(ConsumerRecord<String, String> record, Acknowledgment ack) throws Exception {
        Map<String, Object> event = objectMapper.readValue(
                record.value(),
                new TypeReference<>() {}
        );
        String eventType = (String) event.getOrDefault("event_type", "");
        Map<String, Object> payload = extractPayload(event);

        switch (eventType) {
            case "ai.message.chunk.v2" -> handleChunk(payload);
            case "ai.message.completed.v2" -> handleCompleted(payload);
            case "ai.message.failed.v2" -> handleFailed(payload);
            case "ai.message.cancelled.v2" -> handleCancelled(payload);
            default -> log.warn("Unknown RAG event type: {}", eventType);
        }

        ack.acknowledge();
    }

    private void handleChunk(Map<String, Object> payload) {
        String chatroomId = (String) payload.getOrDefault("chatroom_id", "");
        String messageId = (String) payload.getOrDefault("message_id", "");
        String contentDelta = (String) payload.getOrDefault("content_delta", "");
        int sequence = toInt(payload.get("sequence"));
        boolean done = Boolean.TRUE.equals(payload.get("done"));

        log.debug("RAG chunk: chatroomId={} messageId={} seq={} done={}", chatroomId, messageId, sequence, done);
        redisPublisher.publishAiChunk(chatroomId, messageId, sequence, contentDelta, done);
    }

    private void handleCompleted(Map<String, Object> payload) {
        String chatroomId = (String) payload.getOrDefault("chatroom_id", "");
        String messageId = (String) payload.getOrDefault("message_id", "");
        String finalContent = (String) payload.getOrDefault("final_content", "");

        log.info("RAG generation completed: chatroomId={} messageId={}", chatroomId, messageId);
        redisPublisher.publishAiCompleted(chatroomId, messageId, finalContent);
    }

    private void handleFailed(Map<String, Object> payload) {
        String chatroomId = (String) payload.getOrDefault("chatroom_id", "");
        String messageId = (String) payload.getOrDefault("message_id", "");
        String error = (String) payload.getOrDefault("error", "Unknown error");

        log.error("RAG generation failed: chatroomId={} messageId={} error={}", chatroomId, messageId, error);
        redisPublisher.publishAiFailed(chatroomId, messageId, error);
    }

    private void handleCancelled(Map<String, Object> payload) {
        String chatroomId = (String) payload.getOrDefault("chatroom_id", "");
        String messageId = (String) payload.getOrDefault("message_id", "");

        log.info("RAG generation cancelled: chatroomId={} messageId={}", chatroomId, messageId);
        redisPublisher.publishAiCancelled(chatroomId, messageId);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> extractPayload(Map<String, Object> event) {
        Object p = event.get("payload");
        if (p instanceof Map<?, ?> map) {
            return (Map<String, Object>) map;
        }
        return event;
    }

    private int toInt(Object value) {
        if (value instanceof Number n) return n.intValue();
        return 0;
    }
}
