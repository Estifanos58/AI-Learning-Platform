package com.aiplatform.file.service;

import com.aiplatform.file.domain.FileEntity;
import com.aiplatform.file.domain.FolderEntity;
import com.aiplatform.file.domain.FolderShareEntity;
import com.aiplatform.file.exception.DuplicateShareException;
import com.aiplatform.file.exception.FileNotFoundException;
import com.aiplatform.file.exception.InvalidFileOperationException;
import com.aiplatform.file.exception.UnauthorizedFileAccessException;
import com.aiplatform.file.repository.FileRepository;
import com.aiplatform.file.repository.FileShareRepository;
import com.aiplatform.file.repository.FolderRepository;
import com.aiplatform.file.repository.FolderShareRepository;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class FolderApplicationService {

    private final FolderRepository folderRepository;
    private final FolderShareRepository folderShareRepository;
    private final FileRepository fileRepository;
    private final FileShareRepository fileShareRepository;
    private final FileEventPublisher fileEventPublisher;
    private final MeterRegistry meterRegistry;

    @Transactional
    public FolderEntity createFolder(String name, String parentIdRaw, AuthenticatedPrincipal principal) {
        requireAuthenticated(principal);
        String safeName = requireFolderName(name);
        UUID parentId = parseOptionalUuid(parentIdRaw);
        if (parentId != null) {
            throw new InvalidFileOperationException("Nested folders are not supported yet");
        }

        if (folderRepository.existsByOwnerIdAndParentIdIsNullAndNameIgnoreCaseAndDeletedFalse(principal.userId(), safeName)) {
            throw new InvalidFileOperationException("Folder with this name already exists");
        }

        FolderEntity folder = FolderEntity.builder()
                .id(UUID.randomUUID())
                .ownerId(principal.userId())
                .name(safeName)
                .parentId(null)
                .deleted(Boolean.FALSE)
                .build();

        FolderEntity saved = folderRepository.save(folder);
        fileEventPublisher.publishFolderCreated(saved);
        meterRegistry.counter("folder.create.count").increment();

        log.info("Folder created. folderId={}, ownerId={}, correlationId={}",
                saved.getId(), saved.getOwnerId(), principal.correlationId());
        return saved;
    }

    @Transactional
    public FolderEntity updateFolder(UUID folderId, String name, AuthenticatedPrincipal principal) {
        FolderEntity folder = requireOwnerFolder(folderId, principal);
        String safeName = requireFolderName(name);

        if (!folder.getName().equalsIgnoreCase(safeName)
                && folderRepository.existsByOwnerIdAndParentIdIsNullAndNameIgnoreCaseAndDeletedFalse(folder.getOwnerId(), safeName)) {
            throw new InvalidFileOperationException("Folder with this name already exists");
        }

        folder.setName(safeName);
        FolderEntity saved = folderRepository.save(folder);

        log.info("Folder updated. folderId={}, ownerId={}, correlationId={}",
                saved.getId(), saved.getOwnerId(), principal.correlationId());
        return saved;
    }

    @Transactional
    public void deleteFolder(UUID folderId, AuthenticatedPrincipal principal) {
        FolderEntity folder = requireOwnerFolder(folderId, principal);

        folder.setDeleted(Boolean.TRUE);
        folderRepository.save(folder);
        folderShareRepository.deleteAllByFolderId(folderId);

        List<FileEntity> files = fileRepository.findAllByFolderIdAndDeletedFalse(folderId);
        for (FileEntity file : files) {
            file.setDeleted(Boolean.TRUE);
            fileRepository.save(file);
            fileShareRepository.deleteAllByFileId(file.getId());
            fileEventPublisher.publishDeleted(file);
        }

        fileEventPublisher.publishFolderDeleted(folder);
        log.info("Folder soft deleted. folderId={}, ownerId={}, filesDeleted={}, correlationId={}",
                folder.getId(), folder.getOwnerId(), files.size(), principal.correlationId());
    }

    @Transactional
    public void shareFolder(UUID folderId, UUID sharedWithUserId, AuthenticatedPrincipal principal) {
        FolderEntity folder = requireOwnerFolder(folderId, principal);

        if (folderShareRepository.existsByFolderIdAndSharedWithUserId(folderId, sharedWithUserId)) {
            throw new DuplicateShareException("Folder already shared with this user");
        }

        FolderShareEntity share = FolderShareEntity.builder()
                .id(UUID.randomUUID())
                .folderId(folderId)
                .sharedWithUserId(sharedWithUserId)
                .build();
        folderShareRepository.save(share);
        fileEventPublisher.publishFolderShared(folder, sharedWithUserId);
        meterRegistry.counter("folder.share.count").increment();

        log.info("Folder shared. folderId={}, ownerId={}, targetUserId={}, correlationId={}",
                folder.getId(), folder.getOwnerId(), sharedWithUserId, principal.correlationId());
    }

    @Transactional
    public void unshareFolder(UUID folderId, UUID sharedWithUserId, AuthenticatedPrincipal principal) {
        FolderEntity folder = requireOwnerFolder(folderId, principal);
        folderShareRepository.deleteByFolderIdAndSharedWithUserId(folderId, sharedWithUserId);

        log.info("Folder unshared. folderId={}, ownerId={}, targetUserId={}, correlationId={}",
                folder.getId(), folder.getOwnerId(), sharedWithUserId, principal.correlationId());
    }

    @Transactional(readOnly = true)
    public Page<FolderEntity> listMyFolders(AuthenticatedPrincipal principal, int page, int size) {
        requireAuthenticated(principal);
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.min(Math.max(size, 1), 100));
        return folderRepository.findByOwnerIdAndDeletedFalseOrderByCreatedAtDesc(principal.userId(), pageable);
    }

    @Transactional(readOnly = true)
    public Page<FolderEntity> listSharedFolders(AuthenticatedPrincipal principal, int page, int size) {
        requireAuthenticated(principal);
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.min(Math.max(size, 1), 100));
        return folderRepository.listSharedWith(principal.userId(), pageable);
    }

    @Transactional(readOnly = true)
    public FolderEntity requireActiveFolderForUpload(UUID folderId, AuthenticatedPrincipal principal) {
        requireAuthenticated(principal);
        FolderEntity folder = folderRepository.findByIdAndDeletedFalse(folderId)
                .orElseThrow(() -> new FileNotFoundException("Folder not found"));

        if (folder.getOwnerId().equals(principal.userId())) {
            return folder;
        }

        boolean shared = folderShareRepository.existsByFolderIdAndSharedWithUserId(folderId, principal.userId());
        if (!shared) {
            throw new UnauthorizedFileAccessException("No upload access to this folder");
        }
        return folder;
    }

    @Transactional(readOnly = true)
    public boolean canAccessFolder(UUID folderId, UUID userId) {
        FolderEntity folder = folderRepository.findByIdAndDeletedFalse(folderId).orElse(null);
        if (folder == null) {
            return false;
        }
        if (folder.getOwnerId().equals(userId)) {
            return true;
        }
        return folderShareRepository.existsByFolderIdAndSharedWithUserId(folderId, userId);
    }

    private FolderEntity requireOwnerFolder(UUID folderId, AuthenticatedPrincipal principal) {
        requireAuthenticated(principal);
        FolderEntity folder = folderRepository.findByIdAndDeletedFalse(folderId)
                .orElseThrow(() -> new FileNotFoundException("Folder not found"));

        if (!folder.getOwnerId().equals(principal.userId())) {
            throw new UnauthorizedFileAccessException("Only owner can perform this operation");
        }
        return folder;
    }

    private String requireFolderName(String name) {
        if (name == null || name.isBlank()) {
            throw new InvalidFileOperationException("Folder name is required");
        }
        String value = name.trim();
        if (value.length() > 255) {
            throw new InvalidFileOperationException("Folder name is too long");
        }
        return value;
    }

    private UUID parseOptionalUuid(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return UUID.fromString(raw.trim());
        } catch (IllegalArgumentException exception) {
            throw new InvalidFileOperationException("Invalid parent folder identifier");
        }
    }

    private void requireAuthenticated(AuthenticatedPrincipal principal) {
        if (principal == null || principal.userId() == null) {
            throw new UnauthorizedFileAccessException("Missing authenticated user metadata");
        }
    }
}
