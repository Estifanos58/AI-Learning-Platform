package com.aiplatform.file.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "folder_shares")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FolderShareEntity {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "folder_id", nullable = false, updatable = false)
    private UUID folderId;

    @Column(name = "shared_with_user_id", nullable = false, updatable = false)
    private UUID sharedWithUserId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
