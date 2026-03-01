package com.aiplatform.file.service;

import com.aiplatform.file.config.FileStorageProperties;
import com.aiplatform.file.domain.FileEntity;
import com.aiplatform.file.domain.FileShareEntity;
import com.aiplatform.file.domain.FileType;
import com.aiplatform.file.domain.FolderEntity;
import com.aiplatform.file.exception.DuplicateShareException;
import com.aiplatform.file.exception.FileNotFoundException;
import com.aiplatform.file.exception.InvalidFileOperationException;
import com.aiplatform.file.exception.UnauthorizedFileAccessException;
import com.aiplatform.file.repository.FileRepository;
import com.aiplatform.file.repository.FileShareRepository;
import com.aiplatform.file.repository.FolderShareRepository;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.time.LocalDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class FileApplicationService {

    private final FileRepository fileRepository;
    private final FileShareRepository fileShareRepository;
    private final FolderShareRepository folderShareRepository;
    private final FileStorageProperties storageProperties;
    private final FolderApplicationService folderApplicationService;
    private final FileEventPublisher fileEventPublisher;
    private final MeterRegistry meterRegistry;

    @Transactional
    public FileEntity uploadFile(AuthenticatedPrincipal principal,
                                 FileType fileType,
                                 String originalName,
                                 String contentType,
                                 byte[] content,
                                 boolean isShareable,
                                 UUID folderId) {
        requireAuthenticated(principal);

        if (folderId == null) {
            throw new InvalidFileOperationException("folderId is required");
        }

        FolderEntity folder = folderApplicationService.requireActiveFolderForUpload(folderId, principal);

        if (content == null || content.length == 0) {
            throw new InvalidFileOperationException("Uploaded file content is empty");
        }

        long maxSizeBytes = storageProperties.maxSizeMb() * 1024L * 1024L;
        if (content.length > maxSizeBytes) {
            throw new InvalidFileOperationException("File size exceeds configured limit");
        }

        UUID fileId = UUID.randomUUID();
        String extension = extension(originalName);
        String storedName = storedNameFor(fileId, extension);
        Path targetPath = targetPath(folder.getOwnerId(), folder.getId(), storedName);

        writeFile(targetPath, content, principal);

        if (fileType == FileType.PROFILE_IMAGE) {
            if (!principal.userId().equals(folder.getOwnerId())) {
                throw new UnauthorizedFileAccessException("Profile image can only be uploaded to your own folder");
            }
            fileRepository.findActiveProfileImageByOwnerId(folder.getOwnerId(), FileType.PROFILE_IMAGE)
                    .ifPresent(existing -> existing.setDeleted(Boolean.TRUE));
            isShareable = false;
        }

        FileEntity entity = FileEntity.builder()
                .id(fileId)
                .ownerId(folder.getOwnerId())
                .folderId(folder.getId())
                .fileType(fileType)
                .originalName(safeOriginalName(originalName, storedName))
                .storedName(storedName)
                .contentType(blankToNull(contentType))
                .fileSize((long) content.length)
                .storagePath(targetPath.toAbsolutePath().toString())
                .isShareable(isShareable)
                .deleted(Boolean.FALSE)
                .build();

        FileEntity saved = fileRepository.save(entity);
        fileEventPublisher.publishUploaded(saved);
        meterRegistry.counter("file.upload.count").increment();

        log.info("File uploaded. fileId={}, folderId={}, ownerId={}, correlationId={}",
            saved.getId(), saved.getFolderId(), saved.getOwnerId(), principal.correlationId());
        return saved;
    }

    @Transactional(readOnly = true)
    public FileEntity getMetadata(UUID fileId, AuthenticatedPrincipal principal) {
        FileEntity file = findActiveFile(fileId);
        validateCanAccess(file, principal);
        return file;
    }

    @Transactional
    public void deleteFile(UUID fileId, AuthenticatedPrincipal principal) {
        FileEntity file = findActiveFile(fileId);
        validateOwner(file, principal);

        file.setDeleted(Boolean.TRUE);
        fileRepository.save(file);
        fileShareRepository.deleteAllByFileId(fileId);
        fileEventPublisher.publishDeleted(file);

        log.info("File soft deleted. fileId={}, folderId={}, ownerId={}, correlationId={}",
            file.getId(), file.getFolderId(), file.getOwnerId(), principal.correlationId());
    }

    @Transactional
    public void shareFile(UUID fileId, UUID sharedWithUserId, AuthenticatedPrincipal principal) {
        FileEntity file = findActiveFile(fileId);
        validateOwner(file, principal);

        if (!Boolean.TRUE.equals(file.getIsShareable())) {
            throw new InvalidFileOperationException("File is not shareable");
        }

        if (fileShareRepository.existsByFileIdAndSharedWithUserId(fileId, sharedWithUserId)) {
            throw new DuplicateShareException("File already shared with this user");
        }

        FileShareEntity shareEntity = FileShareEntity.builder()
                .id(UUID.randomUUID())
                .fileId(fileId)
                .sharedWithUserId(sharedWithUserId)
                .createdAt(LocalDateTime.now())
                .build();
        fileShareRepository.save(shareEntity);

        log.info("File shared. fileId={}, folderId={}, ownerId={}, targetUserId={}, correlationId={}",
            file.getId(), file.getFolderId(), file.getOwnerId(), sharedWithUserId, principal.correlationId());
    }

    @Transactional
    public void unshareFile(UUID fileId, UUID sharedWithUserId, AuthenticatedPrincipal principal) {
        FileEntity file = findActiveFile(fileId);
        validateOwner(file, principal);

        fileShareRepository.deleteByFileIdAndSharedWithUserId(fileId, sharedWithUserId);
        log.info("File unshared. fileId={}, folderId={}, ownerId={}, targetUserId={}, correlationId={}",
            file.getId(), file.getFolderId(), file.getOwnerId(), sharedWithUserId, principal.correlationId());
    }

    @Transactional
    public FileEntity updateFileMetadata(UUID fileId, boolean isShareable, AuthenticatedPrincipal principal) {
        FileEntity file = findActiveFile(fileId);
        validateOwner(file, principal);

        if (file.getFileType() == FileType.PROFILE_IMAGE && isShareable) {
            throw new InvalidFileOperationException("Profile image cannot be marked as shareable");
        }

        file.setIsShareable(isShareable);
        if (!isShareable) {
            fileShareRepository.deleteAllByFileId(fileId);
        }

        FileEntity saved = fileRepository.save(file);
        log.info("File metadata updated. fileId={}, folderId={}, ownerId={}, shareable={}, correlationId={}",
            saved.getId(), saved.getFolderId(), saved.getOwnerId(), saved.getIsShareable(), principal.correlationId());
        return saved;
    }

    @Transactional(readOnly = true)
    public Page<FileEntity> listMyFiles(AuthenticatedPrincipal principal, int page, int size, FileType fileType, boolean includeDeleted) {
        requireAuthenticated(principal);
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.min(Math.max(size, 1), 100));
        return fileRepository.listOwnedFiles(principal.userId(), fileType, includeDeleted, pageable);
    }

    @Transactional(readOnly = true)
    public Page<FileEntity> listSharedWithMe(AuthenticatedPrincipal principal, int page, int size) {
        requireAuthenticated(principal);
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.min(Math.max(size, 1), 100));
        return fileRepository.listSharedWith(principal.userId(), pageable);
    }

    @Transactional(readOnly = true)
    public String getFilePath(UUID fileId, AuthenticatedPrincipal principal) {
        FileEntity file = findActiveFile(fileId);
        validateCanAccess(file, principal);
        return file.getStoragePath();
    }

    private void writeFile(Path targetPath, byte[] content, AuthenticatedPrincipal principal) {
        try {
            Files.createDirectories(targetPath.getParent());
            Files.write(targetPath, content, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING, StandardOpenOption.WRITE);
        } catch (IOException exception) {
            log.error("Physical file write failed. path={}, ownerId={}, correlationId={}",
                    targetPath, principal.userId(), principal.correlationId(), exception);
            throw new InvalidFileOperationException("Failed to persist physical file");
        }
    }

    private FileEntity findActiveFile(UUID fileId) {
        return fileRepository.findByIdAndDeletedFalse(fileId)
                .orElseThrow(() -> new FileNotFoundException("File not found"));
    }

    private void validateOwner(FileEntity file, AuthenticatedPrincipal principal) {
        requireAuthenticated(principal);
        if (!file.getOwnerId().equals(principal.userId())) {
            throw new UnauthorizedFileAccessException("Only owner can perform this operation");
        }
    }

    private void validateCanAccess(FileEntity file, AuthenticatedPrincipal principal) {
        requireAuthenticated(principal);
        if (file.getOwnerId().equals(principal.userId())) {
            return;
        }

        boolean folderShared = folderShareRepository.existsByFolderIdAndSharedWithUserId(file.getFolderId(), principal.userId());
        if (folderShared) {
            return;
        }

        boolean shared = fileShareRepository.existsByFileIdAndSharedWithUserId(file.getId(), principal.userId());
        if (!shared) {
            throw new UnauthorizedFileAccessException("No access to this file");
        }
    }

    private void requireAuthenticated(AuthenticatedPrincipal principal) {
        if (principal == null || principal.userId() == null) {
            throw new UnauthorizedFileAccessException("Missing authenticated user metadata");
        }
    }

    private String safeOriginalName(String originalName, String fallback) {
        String cleaned = blankToNull(originalName);
        return cleaned == null ? fallback : cleaned;
    }

    private String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private String extension(String fileName) {
        if (fileName == null || fileName.isBlank()) {
            return "";
        }
        int lastDot = fileName.lastIndexOf('.');
        if (lastDot <= 0 || lastDot == fileName.length() - 1) {
            return "";
        }
        String ext = fileName.substring(lastDot + 1).replaceAll("[^A-Za-z0-9]", "");
        return ext.isBlank() ? "" : ext.toLowerCase();
    }

    private String storedNameFor(UUID fileId, String extension) {
        return extension.isBlank() ? fileId.toString() : fileId + "." + extension;
    }

    private Path targetPath(UUID ownerId, UUID folderId, String storedName) {
        Path root = Paths.get(storageProperties.rootPath());
        return root.resolve(ownerId.toString()).resolve(folderId.toString()).resolve(storedName);
    }
}
