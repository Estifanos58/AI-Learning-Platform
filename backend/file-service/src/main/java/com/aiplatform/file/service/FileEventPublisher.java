package com.aiplatform.file.service;

import com.aiplatform.file.config.KafkaFileTopicProperties;
import com.aiplatform.file.domain.FileEntity;
import com.aiplatform.file.domain.FolderEntity;
import com.aiplatform.file.domain.OutboxEvent;
import com.aiplatform.file.repository.OutboxEventRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Serializes file and folder domain events safely with Jackson and writes them to the
 * transactional outbox inside the caller's database transaction.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class FileEventPublisher {

    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    private final KafkaFileTopicProperties topicProperties;
    private final OutboxEventRepository outboxEventRepository;
    private final ObjectMapper objectMapper;

    public void publishUploaded(FileEntity file) {
        if (!topicProperties.enabled()) {
            return;
        }
        enqueueOutbox(topicProperties.uploadedTopic(), file.getId().toString(), toPayload("file.uploaded.v1", file));
        publishUploadedV2(file);
    }

    public void publishUploadedV2(FileEntity file) {
        if (!topicProperties.enabled()) {
            return;
        }
        String v2Topic = topicProperties.uploadedV2Topic();
        if (v2Topic == null || v2Topic.isBlank()) {
            return;
        }
        enqueueOutbox(v2Topic, file.getId().toString(), toPayloadV2(file));
    }

    public void publishDeleted(FileEntity file) {
        if (!topicProperties.enabled()) {
            return;
        }
        enqueueOutbox(topicProperties.deletedTopic(), file.getId().toString(), toPayload("file.deleted.v1", file));
    }

    public void publishFolderCreated(FolderEntity folder) {
        if (!topicProperties.enabled()) {
            return;
        }
        enqueueOutbox(topicProperties.folderCreatedTopic(), folder.getId().toString(), toFolderPayload("folder.created.v1", folder, null));
    }

    public void publishFolderDeleted(FolderEntity folder) {
        if (!topicProperties.enabled()) {
            return;
        }
        enqueueOutbox(topicProperties.folderDeletedTopic(), folder.getId().toString(), toFolderPayload("folder.deleted.v1", folder, null));
    }

    public void publishFolderShared(FolderEntity folder, UUID sharedWithUserId) {
        if (!topicProperties.enabled()) {
            return;
        }
        enqueueOutbox(topicProperties.folderSharedTopic(), folder.getId().toString(), toFolderPayload("folder.shared.v1", folder, sharedWithUserId));
    }

    private void enqueueOutbox(String topic, String eventKey, String payloadJson) {
        if (topic == null || topic.isBlank()) {
            return;
        }
        LocalDateTime now = LocalDateTime.now();
        String correlationId = MDC.get("correlationId");
        outboxEventRepository.save(OutboxEvent.builder()
                .id(UUID.randomUUID())
                .topic(topic)
                .eventKey(eventKey)
                .payload(payloadJson)
                .headersJson(correlationId == null ? "" : correlationId)
                .status("PENDING")
                .retryCount(0)
                .nextAttemptAt(now)
                .createdAt(now)
                .build());
    }

    String toPayload(String eventType, FileEntity file) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("eventId", UUID.randomUUID().toString());
        body.put("eventType", eventType);
        body.put("fileId", file.getId().toString());
        body.put("ownerId", file.getOwnerId().toString());
        body.put("fileType", file.getFileType().name());
        body.put("path", file.getStoragePath() == null ? "" : file.getStoragePath());
        body.put("timestamp", TIME_FORMATTER.format(LocalDateTime.now()));
        return toJson(body);
    }

    String toPayloadV2(FileEntity file) {
        Map<String, Object> inner = new LinkedHashMap<>();
        inner.put("file_id", file.getId().toString());
        inner.put("owner_id", file.getOwnerId().toString());
        inner.put("folder_id", file.getFolderId() == null ? "" : file.getFolderId().toString());
        inner.put("file_name", file.getOriginalName() == null ? "" : file.getOriginalName());
        inner.put("file_type", file.getFileType().name());
        inner.put("content_type", file.getContentType() == null ? "" : file.getContentType());
        inner.put("storage_path", file.getStoragePath() == null ? "" : file.getStoragePath());
        inner.put("file_size", file.getFileSize() == null ? 0L : file.getFileSize());
        inner.put("is_shareable", Boolean.TRUE.equals(file.getIsShareable()));
        inner.put("tags", List.of());
        inner.put("metadata", Map.of());

        Map<String, Object> envelope = new LinkedHashMap<>();
        envelope.put("event_id", UUID.randomUUID().toString());
        envelope.put("event_type", "file.uploaded.v2");
        envelope.put("timestamp", TIME_FORMATTER.format(LocalDateTime.now()));
        envelope.put("payload", inner);
        return toJson(envelope);
    }

    String toFolderPayload(String eventType, FolderEntity folder, @Nullable UUID sharedWithUserId) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("eventId", UUID.randomUUID().toString());
        body.put("eventType", eventType);
        body.put("folderId", folder.getId().toString());
        body.put("ownerId", folder.getOwnerId().toString());
        body.put("timestamp", TIME_FORMATTER.format(LocalDateTime.now()));
        if (sharedWithUserId != null) {
            body.put("sharedWithUserId", sharedWithUserId.toString());
        }
        return toJson(body);
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Failed to serialize file domain event", ex);
        }
    }
}
