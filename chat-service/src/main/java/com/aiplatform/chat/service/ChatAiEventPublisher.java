package com.aiplatform.chat.service;

import com.aiplatform.chat.config.KafkaChatTopicProperties;
import com.aiplatform.chat.domain.MessageEntity;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class ChatAiEventPublisher {

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final KafkaChatTopicProperties topicProperties;
    private final ObjectMapper objectMapper;

    public void publishAiRequested(MessageEntity message, String correlationId) {
        if (message.getAiModelId() == null) {
            return;
        }

        Map<String, Object> payload = Map.of(
                "eventId", UUID.randomUUID().toString(),
                "messageId", message.getId().toString(),
                "chatroomId", message.getChatroomId().toString(),
                "userId", message.getUserId().toString(),
                "aiModelId", message.getAiModelId().toString(),
                "content", message.getContent() == null ? "" : message.getContent(),
                "timestamp", LocalDateTime.now().toString(),
                "correlationId", correlationId == null ? "" : correlationId
        );

        try {
            String serialized = objectMapper.writeValueAsString(payload);
            kafkaTemplate.send(topicProperties.aiRequestedTopic(), message.getChatroomId().toString(), serialized)
                    .whenComplete((result, throwable) -> {
                        if (throwable != null) {
                            log.error("Kafka publish failed. topic={}, messageId={}, chatroomId={}, correlationId={}",
                                    topicProperties.aiRequestedTopic(), message.getId(), message.getChatroomId(), correlationId, throwable);
                            return;
                        }
                        log.info("Kafka AI event published. topic={}, messageId={}, chatroomId={}, correlationId={}",
                                topicProperties.aiRequestedTopic(), message.getId(), message.getChatroomId(), correlationId);
                    });
        } catch (JsonProcessingException exception) {
            log.error("Failed to serialize AI Kafka event. messageId={}, chatroomId={}, correlationId={}",
                    message.getId(), message.getChatroomId(), correlationId, exception);
        }
    }
}
