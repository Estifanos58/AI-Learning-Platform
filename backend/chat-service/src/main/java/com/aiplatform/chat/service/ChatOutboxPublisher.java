package com.aiplatform.chat.service;

import com.aiplatform.chat.domain.OutboxEvent;
import com.aiplatform.chat.repository.OutboxEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.common.header.internals.RecordHeader;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatOutboxPublisher {

    private static final int BATCH_SIZE = 50;
    private static final int MAX_RETRIES = 5;

    private final OutboxEventRepository outboxEventRepository;
    private final KafkaTemplate<String, String> kafkaTemplate;

    @Scheduled(fixedDelayString = "${app.outbox.poll-interval-ms:500}")
    @Transactional
    public void publishPendingEvents() {
        List<OutboxEvent> events = outboxEventRepository.claimDueEvents(LocalDateTime.now(), BATCH_SIZE);
        for (OutboxEvent event : events) {
            publishSingle(event);
        }
    }

    public void publishSingle(OutboxEvent event) {
        try {
            ProducerRecord<String, String> record = new ProducerRecord<>(
                    event.getTopic(),
                    event.getEventKey(),
                    event.getPayload()
            );
            if (event.getHeadersJson() != null && !event.getHeadersJson().isBlank()) {
                record.headers().add(new RecordHeader("x-correlation-id", event.getHeadersJson().getBytes(StandardCharsets.UTF_8)));
            }
            kafkaTemplate.send(record).get(10, TimeUnit.SECONDS);
            event.setStatus("PUBLISHED");
            event.setPublishedAt(LocalDateTime.now());
            event.setLastError(null);
            outboxEventRepository.save(event);
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            scheduleRetryOrFail(event, interrupted);
        } catch (Exception ex) {
            scheduleRetryOrFail(event, ex);
        }
    }

    private void scheduleRetryOrFail(OutboxEvent event, Exception ex) {
        int nextRetry = event.getRetryCount() + 1;
        event.setRetryCount(nextRetry);
        String msg = ex.getMessage() == null ? ex.getClass().getSimpleName() : ex.getMessage();
        event.setLastError(msg.length() > 1000 ? msg.substring(0, 1000) : msg);
        if (nextRetry >= MAX_RETRIES) {
            event.setStatus("FAILED");
            log.error("Chat outbox event exceeded max retries. id={}, topic={}", event.getId(), event.getTopic(), ex);
        } else {
            long delaySeconds = Math.min(60L, 1L << Math.min(nextRetry, 6));
            event.setNextAttemptAt(LocalDateTime.now().plusSeconds(delaySeconds));
            log.warn("Chat outbox publish failed (attempt {}/{}), retrying in {}s. id={}", nextRetry, MAX_RETRIES, delaySeconds, event.getId());
        }
        outboxEventRepository.save(event);
    }
}
