package com.aiplatform.auth.service.event;

import com.aiplatform.auth.domain.OutboxEvent;
import com.aiplatform.auth.repository.OutboxEventRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthOutboxPublisherTest {

    @Mock
    private OutboxEventRepository outboxEventRepository;

    @Mock
    private KafkaTemplate<String, String> kafkaTemplate;

    private AuthOutboxPublisher publisher;

    @BeforeEach
    void setUp() {
        publisher = new AuthOutboxPublisher(outboxEventRepository, kafkaTemplate, new ObjectMapper());
    }

    @Test
    @DisplayName("Marks outbox event PUBLISHED only after Kafka broker acknowledges send")
    @SuppressWarnings("unchecked")
    void publishPendingEvents_marksPublishedAfterBrokerAck() {
        OutboxEvent event = OutboxEvent.builder()
                .id(UUID.randomUUID())
                .topic("user.registered.v1")
                .eventKey("user-1")
                .payload("{\"eventType\":\"USER_REGISTERED\"}")
                .headersJson("{\"correlationId\":\"corr-1\"}")
                .status("PENDING")
                .retryCount(0)
                .nextAttemptAt(LocalDateTime.now().minusSeconds(1))
                .createdAt(LocalDateTime.now().minusSeconds(5))
                .build();

        when(outboxEventRepository.claimDueEvents(any(), anyInt())).thenReturn(List.of(event));
        when(kafkaTemplate.send(any(ProducerRecord.class)))
                .thenReturn(CompletableFuture.completedFuture((SendResult<String, String>) null));

        publisher.publishPendingEvents();

        assertThat(event.getStatus()).isEqualTo("PUBLISHED");
        assertThat(event.getPublishedAt()).isNotNull();
        verify(outboxEventRepository).save(event);
    }

    @Test
    @DisplayName("Keeps outbox event PENDING and schedules retry backoff when Kafka send fails")
    @SuppressWarnings("unchecked")
    void publishPendingEvents_retriesWhenKafkaFails() {
        OutboxEvent event = OutboxEvent.builder()
                .id(UUID.randomUUID())
                .topic("user.email.verification.v1")
                .eventKey("user-2")
                .payload("{}")
                .status("PENDING")
                .retryCount(0)
                .nextAttemptAt(LocalDateTime.now().minusSeconds(1))
                .createdAt(LocalDateTime.now().minusSeconds(5))
                .build();

        CompletableFuture<SendResult<String, String>> failed = new CompletableFuture<>();
        failed.completeExceptionally(new RuntimeException("Broker unavailable"));

        when(outboxEventRepository.claimDueEvents(any(), anyInt())).thenReturn(List.of(event));
        when(kafkaTemplate.send(any(ProducerRecord.class))).thenReturn(failed);

        publisher.publishPendingEvents();

        assertThat(event.getStatus()).isEqualTo("PENDING");
        assertThat(event.getRetryCount()).isEqualTo(1);
        assertThat(event.getLastError()).contains("Broker unavailable");
        assertThat(event.getNextAttemptAt()).isAfter(LocalDateTime.now().minusSeconds(1));
        verify(outboxEventRepository).save(event);
    }
}
