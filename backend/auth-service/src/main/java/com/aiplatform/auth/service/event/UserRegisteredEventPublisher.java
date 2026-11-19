package com.aiplatform.auth.service.event;

import com.aiplatform.auth.domain.OutboxEvent;
import com.aiplatform.auth.repository.OutboxEventRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class UserRegisteredEventPublisher {

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    private final OutboxEventRepository outboxEventRepository;
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
            String headersJson = objectMapper.writeValueAsString(Map.of(
                    "correlationId", correlationId == null ? "" : correlationId,
                    "eventVersion", "v1"
            ));
            LocalDateTime now = LocalDateTime.now();
            outboxEventRepository.save(OutboxEvent.builder()
                    .id(UUID.randomUUID())
                    .topic(userRegisteredTopic)
                    .eventKey(userId.toString())
                    .payload(payload)
                    .headersJson(headersJson)
                    .status("PENDING")
                    .retryCount(0)
                    .nextAttemptAt(now)
                    .createdAt(now)
                    .build());
            log.info("Queued user-registered outbox event. userId={}, eventId={}", userId, event.eventId());
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Failed to serialize UserRegistered event", exception);
        }
    }
}
