package com.aiplatform.file.repository;

import com.aiplatform.file.domain.OutboxEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface OutboxEventRepository extends JpaRepository<OutboxEvent, UUID> {

    @Query(
            value = """
                    SELECT * FROM outbox_events
                    WHERE status = 'PENDING'
                      AND next_attempt_at <= :now
                    ORDER BY created_at ASC
                    LIMIT :batchSize
                    FOR UPDATE SKIP LOCKED
                    """,
            nativeQuery = true
    )
    List<OutboxEvent> claimDueEvents(@Param("now") LocalDateTime now, @Param("batchSize") int batchSize);
}
