package com.aiplatform.file.service;

import com.aiplatform.file.config.KafkaFileTopicProperties;
import com.aiplatform.file.domain.FileEntity;
import com.aiplatform.file.domain.FileType;
import com.aiplatform.file.domain.OutboxEvent;
import com.aiplatform.file.repository.OutboxEventRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
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
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FileEventPublisherAndOutboxTest {

    @Mock
    private OutboxEventRepository outboxEventRepository;

    @Mock
    private KafkaTemplate<String, String> kafkaTemplate;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    @DisplayName("Serializes filenames with quotes, backslashes, and newlines safely into outbox JSON")
    void publishUploaded_safelySerializesJsonIntoOutbox() throws Exception {
        KafkaFileTopicProperties props = new KafkaFileTopicProperties(
                true, "file.uploaded.v1", "file.uploaded.v2", "file.deleted.v1",
                "folder.created.v1", "folder.deleted.v1", "folder.shared.v1"
        );
        FileEventPublisher publisher = new FileEventPublisher(props, outboxEventRepository, objectMapper);

        FileEntity file = FileEntity.builder()
                .id(UUID.randomUUID())
                .ownerId(UUID.randomUUID())
                .fileType(FileType.DOCUMENT)
                .originalName("notes \"final\" \\ v2\n.pdf")
                .contentType("application/pdf")
                .storagePath("/data/docs/file\\1.pdf")
                .fileSize(2048L)
                .isShareable(true)
                .build();

        publisher.publishUploaded(file);

        ArgumentCaptor<OutboxEvent> captor = ArgumentCaptor.forClass(OutboxEvent.class);
        verify(outboxEventRepository, times(2)).save(captor.capture());

        OutboxEvent v2Event = captor.getAllValues().get(1);
        assertThat(v2Event.getTopic()).isEqualTo("file.uploaded.v2");
        assertThat(v2Event.getStatus()).isEqualTo("PENDING");

        JsonNode parsed = objectMapper.readTree(v2Event.getPayload());
        assertThat(parsed.path("payload").path("file_name").asText()).isEqualTo("notes \"final\" \\ v2\n.pdf");
        assertThat(parsed.path("payload").path("storage_path").asText()).isEqualTo("/data/docs/file\\1.pdf");
    }

    @Test
    @DisplayName("Outbox publisher confirms Kafka ack before marking PUBLISHED")
    @SuppressWarnings("unchecked")
    void outboxPublisher_marksPublishedAfterAck() {
        KafkaFileTopicProperties props = new KafkaFileTopicProperties(
                true, "file.uploaded.v1", "file.uploaded.v2", "file.deleted.v1",
                "folder.created.v1", "folder.deleted.v1", "folder.shared.v1"
        );
        FileOutboxPublisher outboxPublisher = new FileOutboxPublisher(outboxEventRepository, props, kafkaTemplate);

        OutboxEvent event = OutboxEvent.builder()
                .id(UUID.randomUUID())
                .topic("file.uploaded.v2")
                .eventKey("file-1")
                .payload("{\"event_type\":\"file.uploaded.v2\"}")
                .status("PENDING")
                .retryCount(0)
                .nextAttemptAt(LocalDateTime.now().minusSeconds(1))
                .createdAt(LocalDateTime.now().minusSeconds(5))
                .build();

        when(outboxEventRepository.claimDueEvents(any(), anyInt())).thenReturn(List.of(event));
        when(kafkaTemplate.send(any(ProducerRecord.class)))
                .thenReturn(CompletableFuture.completedFuture((SendResult<String, String>) null));

        outboxPublisher.publishPendingEvents();

        assertThat(event.getStatus()).isEqualTo("PUBLISHED");
        assertThat(event.getPublishedAt()).isNotNull();
    }
}
