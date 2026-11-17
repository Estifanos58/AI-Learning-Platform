package com.aiplatform.chat.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "messages")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MessageEntity {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "chatroom_id", nullable = false, updatable = false)
    private UUID chatroomId;

    @Column(name = "sender_user_id", nullable = false, updatable = false)
    private UUID senderUserId;

    @Column(name = "ai_model_id")
    private String aiModelId;

    @Column(columnDefinition = "TEXT")
    private String content;

    @Column(name = "file_id")
    private UUID fileId;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
