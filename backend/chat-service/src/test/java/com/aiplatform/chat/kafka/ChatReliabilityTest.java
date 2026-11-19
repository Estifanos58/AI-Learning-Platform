package com.aiplatform.chat.kafka;

import com.aiplatform.chat.domain.OutboxEvent;
import com.aiplatform.chat.repository.OutboxEventRepository;
import com.aiplatform.chat.service.ChatOutboxPublisher;
import com.aiplatform.chat.service.ChatRedisPublisher;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.kafka.support.SendResult;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ChatReliabilityTest {

    @Mock
    private ChatRedisPublisher redisPublisher;

    @Mock
    private Acknowledgment acknowledgment;

    @Mock
    private OutboxEventRepository outboxEventRepository;

    @Mock
    private KafkaTemplate<String, String> kafkaTemplate;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    @DisplayName("RagStreamConsumer propagates error without acknowledging offset so Spring Kafka retries and routes to DLT")
    void onRagEvent_propagatesErrorWithoutAck() {
        RagStreamConsumer consumer = new RagStreamConsumer(redisPublisher, objectMapper);
        ConsumerRecord<String, String> malformed = new ConsumerRecord<>("ai.message.chunk.v2", 0, 5L, "key", "{bad-json");

        assertThatThrownBy(() -> consumer.onRagEvent(malformed, acknowledgment))
                .isInstanceOf(Exception.class);
        verify(acknowledgment, never()).acknowledge();
    }

    @Test
    @DisplayName("RagStreamConsumer acknowledges offset after relaying valid chunk to Redis")
    void onRagEvent_acknowledgesOnSuccess() throws Exception {
        RagStreamConsumer consumer = new RagStreamConsumer(redisPublisher, objectMapper);
        String json = "{\"event_type\":\"ai.message.chunk.v2\",\"payload\":{\"chatroom_id\":\"room-1\",\"message_id\":\"msg-1\",\"content_delta\":\"hi\",\"sequence\":1,\"done\":false}}";
        ConsumerRecord<String, String> record = new ConsumerRecord<>("ai.message.chunk.v2", 0, 6L, "room-1", json);

        consumer.onRagEvent(record, acknowledgment);

        verify(redisPublisher).publishAiChunk("room-1", "msg-1", 1, "hi", false);
        verify(acknowledgment).acknowledge();
    }

    @Test
    @DisplayName("ChatOutboxPublisher marks event PUBLISHED after Kafka broker ack")
    @SuppressWarnings("unchecked")
    void outboxPublisher_marksPublishedAfterAck() {
        ChatOutboxPublisher publisher = new ChatOutboxPublisher(outboxEventRepository, kafkaTemplate);
        OutboxEvent event = OutboxEvent.builder()
                .id(UUID.randomUUID())
                .topic("ai.message.requested.v2")
                .eventKey("room-1")
                .payload("{}")
                .status("PENDING")
                .retryCount(0)
                .nextAttemptAt(LocalDateTime.now().minusSeconds(1))
                .createdAt(LocalDateTime.now().minusSeconds(2))
                .build();

        when(outboxEventRepository.claimDueEvents(any(), anyInt())).thenReturn(List.of(event));
        when(kafkaTemplate.send(any(ProducerRecord.class)))
                .thenReturn(CompletableFuture.completedFuture((SendResult<String, String>) null));

        publisher.publishPendingEvents();

        assertThat(event.getStatus()).isEqualTo("PUBLISHED");
        assertThat(event.getPublishedAt()).isNotNull();
    }
}
