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
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
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
        return uploadFile(principal, fileType, originalName, contentType, content, isShareable, folderId, null);
    }

    @Transactional
    public FileEntity uploadFile(AuthenticatedPrincipal principal,
                                 FileType fileType,
                                 String originalName,
                                 String contentType,
                                 byte[] content,
                                 boolean isShareable,
                                 UUID folderId,
                                 String internalSource) {
        UploadPreparation preparation = prepareUpload(
                principal,
                fileType,
                originalName,
                contentType,
                isShareable,
                folderId,
                internalSource,
                UUID.randomUUID().toString()
        );

        long bytesWritten = content == null ? 0 : content.length;
        appendUploadChunk(preparation, content, bytesWritten, principal);
        return completeUpload(preparation, bytesWritten, principal);
    }

    @Transactional
    public UploadPreparation prepareUpload(AuthenticatedPrincipal principal,
                                           FileType fileType,
                                           String originalName,
                                           String contentType,
                                           boolean isShareable,
                                           UUID folderId,
                                           String internalSource,
                                           String uploadId) {
        requireAuthenticated(principal);

        UUID resolvedFolderId = folderId;
        if (resolvedFolderId == null) {
            if ("chat-service".equals(internalSource)) {
                resolvedFolderId = folderApplicationService.resolveOrCreateSharedInMessageFolder(principal.userId()).getId();
            } else {
                throw new InvalidFileOperationException("folderId is required");
            }
        }

        FolderEntity folder = folderApplicationService.requireActiveFolderForUpload(resolvedFolderId, principal);
        boolean resolvedShareable = isShareable;
        if (fileType == FileType.PROFILE_IMAGE) {
            if (!principal.userId().equals(folder.getOwnerId())) {
                throw new UnauthorizedFileAccessException("Profile image can only be uploaded to your own folder");
            }
            resolvedShareable = false;
        }

        UUID fileId = UUID.randomUUID();
        String extension = extension(originalName);
        String storedName = storedNameFor(fileId, extension);
        Path tempPath = tempUploadPath(uploadId);
        Path targetPath = targetPath(folder.getOwnerId(), folder.getId(), storedName);

        try {
            Files.createDirectories(tempPath.getParent());
        } catch (IOException exception) {
            log.error("Temp upload directory creation failed. path={}, ownerId={}, correlationId={}",
                    tempPath, principal.userId(), principal.correlationId(), exception);
            throw new InvalidFileOperationException("Failed to initialize upload session");
        }

        return new UploadPreparation(
                fileId,
                folder.getOwnerId(),
                folder.getId(),
                fileType,
                safeOriginalName(originalName, storedName),
                blankToNull(contentType),
                resolvedShareable,
                storedName,
                tempPath,
                targetPath
        );
    }

    public void appendUploadChunk(UploadPreparation preparation,
                                  byte[] chunk,
                                  long bytesWritten,
                                  AuthenticatedPrincipal principal) {
        requireAuthenticated(principal);
        if (preparation == null) {
            throw new InvalidFileOperationException("Upload session is not initialized");
        }
        if (chunk == null || chunk.length == 0) {
            return;
        }
        if (bytesWritten > maxSizeBytes()) {
            throw new InvalidFileOperationException("File size exceeds configured limit");
        }

        try {
            Files.write(
                    preparation.tempPath(),
                    chunk,
                    StandardOpenOption.CREATE,
                    StandardOpenOption.WRITE,
                    StandardOpenOption.APPEND
            );
        } catch (IOException exception) {
            log.error("Temp file write failed. path={}, ownerId={}, correlationId={}",
                    preparation.tempPath(), principal.userId(), principal.correlationId(), exception);
            throw new InvalidFileOperationException("Failed to persist upload chunk");
        }
    }

    @Transactional
    public FileEntity completeUpload(UploadPreparation preparation,
                                     long bytesWritten,
                                     AuthenticatedPrincipal principal) {
        requireAuthenticated(principal);
        if (preparation == null) {
            throw new InvalidFileOperationException("Upload session is not initialized");
        }
        if (bytesWritten <= 0) {
            throw new InvalidFileOperationException("Uploaded file content is empty");
        }
        if (bytesWritten > maxSizeBytes()) {
            throw new InvalidFileOperationException("File size exceeds configured limit");
        }

        moveTempFile(preparation, principal);

        if (preparation.fileType() == FileType.PROFILE_IMAGE) {
            fileRepository.findActiveProfileImageByOwnerId(preparation.ownerId(), FileType.PROFILE_IMAGE)
                    .ifPresent(existing -> existing.setDeleted(Boolean.TRUE));
        }

        FileEntity entity = FileEntity.builder()
                .id(preparation.fileId())
                .ownerId(preparation.ownerId())
                .folderId(preparation.folderId())
                .fileType(preparation.fileType())
                .originalName(preparation.originalName())
                .storedName(preparation.storedName())
                .contentType(preparation.contentType())
                .fileSize(bytesWritten)
                .storagePath(preparation.targetPath().toAbsolutePath().toString())
                .isShareable(preparation.isShareable())
                .deleted(Boolean.FALSE)
                .build();

        FileEntity saved = fileRepository.save(entity);
        fileEventPublisher.publishUploaded(saved);
        meterRegistry.counter("file.upload.count").increment();

        log.info("File uploaded. fileId={}, folderId={}, ownerId={}, correlationId={}",
                saved.getId(), saved.getFolderId(), saved.getOwnerId(), principal.correlationId());
        return saved;
    }

    public void markUploadFailed(UploadPreparation preparation,
                                 AuthenticatedPrincipal principal,
                                 String reason) {
        if (preparation == null || principal == null || principal.userId() == null) {
            return;
        }
        log.warn("Upload failed. fileId={}, folderId={}, tempPath={}, ownerId={}, correlationId={}, reason={}",
                preparation.fileId(),
                preparation.folderId(),
                preparation.tempPath(),
                principal.userId(),
                principal.correlationId(),
                reason);
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

    @Transactional(readOnly = true)
    public FileContentResult getFileContent(UUID fileId, AuthenticatedPrincipal principal) {
        FileEntity file = findActiveFile(fileId);
        validateCanAccess(file, principal);

        String storagePath = blankToNull(file.getStoragePath());
        if (storagePath == null) {
            throw new InvalidFileOperationException("Stored file path is missing");
        }

        Path path = Paths.get(storagePath);
        try {
            if (!Files.exists(path) || !Files.isRegularFile(path)) {
                throw new FileNotFoundException("Stored file content not found");
            }
            return new FileContentResult(file, Files.readAllBytes(path));
        } catch (IOException exception) {
            log.error("Physical file read failed. path={}, ownerId={}, correlationId={}",
                    path, principal.userId(), principal.correlationId(), exception);
            throw new InvalidFileOperationException("Failed to read physical file");
        }
    }

    @Transactional(readOnly = true)
    public void streamFileContent(UUID fileId, AuthenticatedPrincipal principal,
                                  java.util.function.BiConsumer<FileEntity, java.io.InputStream> consumer) {
        FileEntity file = findActiveFile(fileId);
        validateCanAccess(file, principal);

        String storagePath = blankToNull(file.getStoragePath());
        if (storagePath == null) {
            throw new InvalidFileOperationException("Stored file path is missing");
        }

        Path path = Paths.get(storagePath);
        try {
            if (!Files.exists(path) || !Files.isRegularFile(path)) {
                throw new FileNotFoundException("Stored file content not found");
            }
            try (java.io.InputStream inputStream = Files.newInputStream(path)) {
                consumer.accept(file, inputStream);
            }
        } catch (IOException exception) {
            log.error("Physical file stream failed. path={}, ownerId={}, correlationId={}",
                    path, principal.userId(), principal.correlationId(), exception);
            throw new InvalidFileOperationException("Failed to stream physical file");
        }
    }

    private void moveTempFile(UploadPreparation preparation, AuthenticatedPrincipal principal) {
        try {
            if (!Files.exists(preparation.tempPath()) || !Files.isRegularFile(preparation.tempPath())) {
                throw new InvalidFileOperationException("Uploaded file content is empty");
            }

            Files.createDirectories(preparation.targetPath().getParent());
            try {
                Files.move(
                        preparation.tempPath(),
                        preparation.targetPath(),
                        StandardCopyOption.REPLACE_EXISTING,
                        StandardCopyOption.ATOMIC_MOVE
                );
            } catch (AtomicMoveNotSupportedException exception) {
                Files.move(preparation.tempPath(), preparation.targetPath(), StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException exception) {
            log.error("Physical file write failed. path={}, ownerId={}, correlationId={}",
                    preparation.targetPath(), principal.userId(), principal.correlationId(), exception);
            throw new InvalidFileOperationException("Failed to persist physical file");
        }
    }

    private long maxSizeBytes() {
        return storageProperties.maxSizeMb() * 1024L * 1024L;
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

    /**
     * RAG authorization check: returns true if userId is owner, or the folder is shared, or the file is explicitly shared.
     */
    public boolean isFileAuthorizedForUser(UUID fileId, UUID userId) {
        return fileRepository.findByIdAndDeletedFalse(fileId)
                .map(file -> {
                    if (file.getOwnerId().equals(userId)) return true;
                    if (folderShareRepository.existsByFolderIdAndSharedWithUserId(file.getFolderId(), userId)) return true;
                    return fileShareRepository.existsByFileIdAndSharedWithUserId(file.getId(), userId);
                })
                .orElse(false);
    }

    /**
     * Returns file metadata if the user is authorized to access it.
     */
    public java.util.Optional<FileEntity> getFileMetadata(UUID fileId, UUID userId) {
        return fileRepository.findByIdAndDeletedFalse(fileId)
                .filter(file -> isFileAuthorizedForUser(fileId, userId));
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

    private Path tempUploadPath(String uploadId) {
        Path root = Paths.get(storageProperties.rootPath());
        return root.resolve("tmp-uploads").resolve(sanitizeUploadId(uploadId) + ".part");
    }

    private String sanitizeUploadId(String uploadId) {
        if (uploadId == null || uploadId.isBlank()) {
            return UUID.randomUUID().toString();
        }
        String sanitized = uploadId.replaceAll("[^A-Za-z0-9-]", "");
        return sanitized.isBlank() ? UUID.randomUUID().toString() : sanitized;
    }

    public record UploadPreparation(
            UUID fileId,
            UUID ownerId,
            UUID folderId,
            FileType fileType,
            String originalName,
            String contentType,
            boolean isShareable,
            String storedName,
            Path tempPath,
            Path targetPath
    ) {
    }
}
