package com.aiplatform.file.repository;

import com.aiplatform.file.domain.FolderShareEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface FolderShareRepository extends JpaRepository<FolderShareEntity, UUID> {

    boolean existsByFolderIdAndSharedWithUserId(UUID folderId, UUID sharedWithUserId);

    void deleteByFolderIdAndSharedWithUserId(UUID folderId, UUID sharedWithUserId);

    void deleteAllByFolderId(UUID folderId);
}
