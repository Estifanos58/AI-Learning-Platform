package com.aiplatform.file.repository;

import com.aiplatform.file.domain.FileShareEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FileShareRepository extends JpaRepository<FileShareEntity, UUID> {

    boolean existsByFileIdAndSharedWithUserId(UUID fileId, UUID sharedWithUserId);

    Optional<FileShareEntity> findByFileIdAndSharedWithUserId(UUID fileId, UUID sharedWithUserId);

    boolean existsByFileIdAndSharedWithUserIdAndIdIsNotNull(UUID fileId, UUID sharedWithUserId);

    void deleteByFileIdAndSharedWithUserId(UUID fileId, UUID sharedWithUserId);

    List<FileShareEntity> findAllByFileId(UUID fileId);

    void deleteAllByFileId(UUID fileId);
}
