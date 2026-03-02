package com.aiplatform.chat.service;

import com.aiplatform.chat.config.KafkaChatTopicProperties;
import com.aiplatform.chat.domain.MessageEntity;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatKafkaPublisher {

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final KafkaChatTopicProperties topicProperties;
    private final ObjectMapper objectMapper;

    public void publishAiMessageRequested(MessageEntity message) {
        if (message.getAiModelId() == null || message.getAiModelId().isBlank()) {
            return;
        }
        Map<String, Object> payload = Map.of(
                "chatroomId", message.getChatroomId().toString(),
                "messageId", message.getId().toString(),
                "aiModelId", message.getAiModelId(),
                "userId", message.getSenderUserId().toString(),
                "content", message.getContent() != null ? message.getContent() : "",
                "fileId", message.getFileId() != null ? message.getFileId().toString() : ""
        );
        try {
            String json = objectMapper.writeValueAsString(payload);
            kafkaTemplate.send(topicProperties.aiMessageTopic(), message.getChatroomId().toString(), json);
            log.info("Published ai.message.requested. messageId={}", message.getId());
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize AI message event. messageId={}", message.getId(), e);
        }
    }
}
