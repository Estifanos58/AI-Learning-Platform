package com.aiplatform.profile.kafka;

import com.aiplatform.profile.service.UserProfileApplicationService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class UserRegisteredConsumer {

    private final ObjectMapper objectMapper;
    private final UserProfileApplicationService userProfileApplicationService;

    @KafkaListener(
            topics = "${app.kafka.topics.user-registered}",
            groupId = "${spring.kafka.consumer.group-id}",
            containerFactory = "userRegisteredKafkaListenerContainerFactory"
    )
    public void consume(String payload, Acknowledgment acknowledgment) throws Exception {
        UserRegisteredEvent event = objectMapper.readValue(payload, UserRegisteredEvent.class);

        if (!"USER_REGISTERED".equalsIgnoreCase(event.eventType())) {
            log.info("Skipping unsupported event type. eventId={}, eventType={}", event.eventId(), event.eventType());
            acknowledgment.acknowledge();
            return;
        }

        UUID userId = UUID.fromString(event.userId());
        String correlationId = event.correlationId() == null ? event.eventId() : event.correlationId();

        userProfileApplicationService.createDefaultProfileIfAbsent(userId, event.universityId(), correlationId);

        log.info("Processed UserRegistered event. eventId={}, userId={}, correlationId={}",
                event.eventId(), userId, correlationId);
        acknowledgment.acknowledge();
    }
}
