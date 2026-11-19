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
public class VerificationEmailEventPublisher {

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    private final OutboxEventRepository outboxEventRepository;
    private final ObjectMapper objectMapper;

    @Value("${app.kafka.topics.user-email-verification:user.email.verification.v1}")
    private String verificationTopic;

    public void publish(UUID userId, String email, String username, String verificationCode, String correlationId) {
        VerificationEmailEvent event = new VerificationEmailEvent(
                UUID.randomUUID().toString(),
                userId.toString(),
                email,
                username,
                verificationCode,
                FORMATTER.format(LocalDateTime.now())
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
                    .topic(verificationTopic)
                    .eventKey(userId.toString())
                    .payload(payload)
                    .headersJson(headersJson)
                    .status("PENDING")
                    .retryCount(0)
                    .nextAttemptAt(now)
                    .createdAt(now)
                    .build());
            log.info("Queued verification email outbox event. userId={}, eventId={}", userId, event.eventId());
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Failed to serialize verification email event", exception);
        }
    }
}
