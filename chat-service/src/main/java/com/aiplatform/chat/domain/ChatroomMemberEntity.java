package com.aiplatform.chat.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "chatroom_members",
       uniqueConstraints = @UniqueConstraint(name = "uq_chatroom_member", columnNames = {"chatroom_id", "user_id"}))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatroomMemberEntity {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "chatroom_id", nullable = false, updatable = false)
    private UUID chatroomId;

    @Column(name = "user_id", nullable = false, updatable = false)
    private UUID userId;

    @Column(name = "joined_at", nullable = false, updatable = false)
    private LocalDateTime joinedAt;

    @PrePersist
    void onCreate() {
        if (joinedAt == null) {
            joinedAt = LocalDateTime.now();
        }
    }
}
