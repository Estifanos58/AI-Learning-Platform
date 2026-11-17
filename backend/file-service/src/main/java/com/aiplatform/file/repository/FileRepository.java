package com.aiplatform.file.repository;

import com.aiplatform.file.domain.FileEntity;
import com.aiplatform.file.domain.FileType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;
import java.util.List;

public interface FileRepository extends JpaRepository<FileEntity, UUID> {

    Optional<FileEntity> findByIdAndDeletedFalse(UUID id);

        List<FileEntity> findAllByFolderIdAndDeletedFalse(UUID folderId);

    @Query("""
            select f
            from FileEntity f
            where f.ownerId = :ownerId
              and f.deleted = false
              and f.fileType = :fileType
            """)
    Optional<FileEntity> findActiveProfileImageByOwnerId(@Param("ownerId") UUID ownerId, @Param("fileType") FileType fileType);

    @Query("""
            select f
            from FileEntity f
            where f.ownerId = :ownerId
              and (:includeDeleted = true or f.deleted = false)
              and (:fileType is null or f.fileType = :fileType)
            """)
    Page<FileEntity> listOwnedFiles(
            @Param("ownerId") UUID ownerId,
            @Param("fileType") FileType fileType,
            @Param("includeDeleted") boolean includeDeleted,
            Pageable pageable
    );

    @Query("""
            select f
            from FileEntity f
            join FileShareEntity fs on fs.fileId = f.id
            where fs.sharedWithUserId = :userId
              and f.deleted = false
            """)
    Page<FileEntity> listSharedWith(@Param("userId") UUID userId, Pageable pageable);
}
