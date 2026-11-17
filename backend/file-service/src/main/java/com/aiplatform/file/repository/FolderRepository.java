package com.aiplatform.file.repository;

import com.aiplatform.file.domain.FolderEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface FolderRepository extends JpaRepository<FolderEntity, UUID> {

    Optional<FolderEntity> findByIdAndDeletedFalse(UUID id);

    Optional<FolderEntity> findByIdAndOwnerIdAndDeletedFalse(UUID id, UUID ownerId);

    Optional<FolderEntity> findByOwnerIdAndParentIdIsNullAndNameIgnoreCaseAndDeletedFalse(UUID ownerId, String name);

    boolean existsByOwnerIdAndParentIdIsNullAndNameIgnoreCaseAndDeletedFalse(UUID ownerId, String name);

    Page<FolderEntity> findByOwnerIdAndDeletedFalseOrderByCreatedAtDesc(UUID ownerId, Pageable pageable);

    @Query("""
            select f
            from FolderEntity f
            join FolderShareEntity fs on fs.folderId = f.id
            where fs.sharedWithUserId = :userId
              and f.deleted = false
            order by f.createdAt desc
            """)
    Page<FolderEntity> listSharedWith(@Param("userId") UUID userId, Pageable pageable);
}
