package com.aiplatform.auth.service.event;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class UserRegisteredEventPublisher {

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;

    @Value("${app.kafka.topics.user-registered:user.registered.v1}")
    private String userRegisteredTopic;

    public void publish(UUID userId, String email, String universityId, String correlationId) {
        UserRegisteredEvent event = new UserRegisteredEvent(
                UUID.randomUUID().toString(),
                "USER_REGISTERED",
                userId.toString(),
                email,
                universityId,
                FORMATTER.format(LocalDateTime.now()),
                correlationId
        );

        try {
            String payload = objectMapper.writeValueAsString(event);
            kafkaTemplate.send(userRegisteredTopic, userId.toString(), payload);
            log.info("Published user-registered event. userId={}, eventId={}", userId, event.eventId());
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Failed to serialize UserRegistered event", exception);
        }
    }
}
