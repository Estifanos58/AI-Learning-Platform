package com.aiplatform.file.grpc;

import com.aiplatform.file.domain.FileEntity;
import com.aiplatform.file.domain.FileType;
import com.aiplatform.file.proto.CreateFolderRequest;
import com.aiplatform.file.proto.DeleteFolderRequest;
import com.aiplatform.file.proto.DeleteFileRequest;
import com.aiplatform.file.proto.FileContentResponse;
import com.aiplatform.file.proto.FilePathResponse;
import com.aiplatform.file.proto.FileResponse;
import com.aiplatform.file.proto.FileServiceGrpc;
import com.aiplatform.file.proto.GetFileContentRequest;
import com.aiplatform.file.proto.FolderResponse;
import com.aiplatform.file.proto.GetFilePathRequest;
import com.aiplatform.file.proto.GetFileRequest;
import com.aiplatform.file.proto.ListFoldersResponse;
import com.aiplatform.file.proto.ListMyFoldersRequest;
import com.aiplatform.file.proto.ListFilesResponse;
import com.aiplatform.file.proto.ListMyFilesRequest;
import com.aiplatform.file.proto.ListSharedFoldersRequest;
import com.aiplatform.file.proto.ListSharedWithMeRequest;
import com.aiplatform.file.proto.ShareFolderRequest;
import com.aiplatform.file.proto.ShareFileRequest;
import com.aiplatform.file.proto.SimpleResponse;
import com.aiplatform.file.proto.UnshareFolderRequest;
import com.aiplatform.file.proto.UnshareFileRequest;
import com.aiplatform.file.proto.UpdateFolderRequest;
import com.aiplatform.file.proto.UpdateFileMetadataRequest;
import com.aiplatform.file.proto.UploadFileChunk;
import com.aiplatform.file.proto.UploadFileRequest;
import com.aiplatform.file.grpc.util.FileGrpcExceptionMapper;
import com.aiplatform.file.grpc.util.FileGrpcPrincipalResolver;
import com.aiplatform.file.grpc.util.FileGrpcResponseMapper;
import com.aiplatform.file.grpc.util.FolderGrpcResponseMapper;
import com.aiplatform.file.service.AuthenticatedPrincipal;
import com.aiplatform.file.service.FileApplicationService;
import com.aiplatform.file.service.FolderApplicationService;
import com.google.protobuf.ByteString;
import io.micrometer.core.instrument.MeterRegistry;
import io.grpc.stub.StreamObserver;
import lombok.RequiredArgsConstructor;
import net.devh.boot.grpc.server.service.GrpcService;

import java.util.UUID;

@GrpcService
@RequiredArgsConstructor
public class FileGrpcService extends FileServiceGrpc.FileServiceImplBase {

    private final FileApplicationService fileApplicationService;
    private final FolderApplicationService folderApplicationService;
    private final MeterRegistry meterRegistry;

    @Override
    public void createFolder(CreateFolderRequest request, StreamObserver<FolderResponse> responseObserver) {
        try {
            AuthenticatedPrincipal principal = FileGrpcPrincipalResolver.requirePrincipal();
            var folder = folderApplicationService.createFolder(request.getName(), request.getParentId(), principal);
            responseObserver.onNext(FolderGrpcResponseMapper.toResponse(folder));
            responseObserver.onCompleted();
        } catch (Exception exception) {
            responseObserver.onError(FileGrpcExceptionMapper.toStatusException(exception));
        }
    }

    @Override
    public void updateFolder(UpdateFolderRequest request, StreamObserver<FolderResponse> responseObserver) {
        try {
            AuthenticatedPrincipal principal = FileGrpcPrincipalResolver.requirePrincipal();
            var folder = folderApplicationService.updateFolder(UUID.fromString(request.getFolderId()), request.getName(), principal);
            responseObserver.onNext(FolderGrpcResponseMapper.toResponse(folder));
            responseObserver.onCompleted();
        } catch (Exception exception) {
            responseObserver.onError(FileGrpcExceptionMapper.toStatusException(exception));
        }
    }

    @Override
    public void deleteFolder(DeleteFolderRequest request, StreamObserver<SimpleResponse> responseObserver) {
        try {
            AuthenticatedPrincipal principal = FileGrpcPrincipalResolver.requirePrincipal();
            folderApplicationService.deleteFolder(UUID.fromString(request.getFolderId()), principal);
            responseObserver.onNext(SimpleResponse.newBuilder().setMessage("Folder deleted").build());
            responseObserver.onCompleted();
        } catch (Exception exception) {
            responseObserver.onError(FileGrpcExceptionMapper.toStatusException(exception));
        }
    }

    @Override
    public void shareFolder(ShareFolderRequest request, StreamObserver<SimpleResponse> responseObserver) {
        try {
            AuthenticatedPrincipal principal = FileGrpcPrincipalResolver.requirePrincipal();
            folderApplicationService.shareFolder(
                    UUID.fromString(request.getFolderId()),
                    UUID.fromString(request.getSharedWithUserId()),
                    principal
            );
            responseObserver.onNext(SimpleResponse.newBuilder().setMessage("Folder shared").build());
            responseObserver.onCompleted();
        } catch (Exception exception) {
            responseObserver.onError(FileGrpcExceptionMapper.toStatusException(exception));
        }
    }

    @Override
    public void unshareFolder(UnshareFolderRequest request, StreamObserver<SimpleResponse> responseObserver) {
        try {
            AuthenticatedPrincipal principal = FileGrpcPrincipalResolver.requirePrincipal();
            folderApplicationService.unshareFolder(
                    UUID.fromString(request.getFolderId()),
                    UUID.fromString(request.getSharedWithUserId()),
                    principal
            );
            responseObserver.onNext(SimpleResponse.newBuilder().setMessage("Folder unshared").build());
            responseObserver.onCompleted();
        } catch (Exception exception) {
            responseObserver.onError(FileGrpcExceptionMapper.toStatusException(exception));
        }
    }

    @Override
    public void listMyFolders(ListMyFoldersRequest request, StreamObserver<ListFoldersResponse> responseObserver) {
        try {
            AuthenticatedPrincipal principal = FileGrpcPrincipalResolver.requirePrincipal();
            var foldersPage = folderApplicationService.listMyFolders(
                    principal,
                    request.getPage(),
                    request.getSize() == 0 ? 20 : request.getSize()
            );

            ListFoldersResponse.Builder builder = ListFoldersResponse.newBuilder().setTotal(foldersPage.getTotalElements());
            foldersPage.getContent().forEach(folder -> builder.addFolders(FolderGrpcResponseMapper.toResponse(folder)));
            responseObserver.onNext(builder.build());
            responseObserver.onCompleted();
        } catch (Exception exception) {
            responseObserver.onError(FileGrpcExceptionMapper.toStatusException(exception));
        }
    }

    @Override
    public void listSharedFolders(ListSharedFoldersRequest request, StreamObserver<ListFoldersResponse> responseObserver) {
        try {
            AuthenticatedPrincipal principal = FileGrpcPrincipalResolver.requirePrincipal();
            var foldersPage = folderApplicationService.listSharedFolders(
                    principal,
                    request.getPage(),
                    request.getSize() == 0 ? 20 : request.getSize()
            );

            ListFoldersResponse.Builder builder = ListFoldersResponse.newBuilder().setTotal(foldersPage.getTotalElements());
            foldersPage.getContent().forEach(folder -> builder.addFolders(FolderGrpcResponseMapper.toResponse(folder)));
            responseObserver.onNext(builder.build());
            responseObserver.onCompleted();
        } catch (Exception exception) {
            responseObserver.onError(FileGrpcExceptionMapper.toStatusException(exception));
        }
    }

    @Override
    public void uploadFile(UploadFileRequest request, StreamObserver<FileResponse> responseObserver) {
        try {
            AuthenticatedPrincipal principal = FileGrpcPrincipalResolver.requirePrincipal();
            String internalSource = GrpcContextKeys.INTERNAL_SOURCE.get();

            UUID folderId = null;
            if (request.getFolderId() != null && !request.getFolderId().isBlank()) {
                folderId = UUID.fromString(request.getFolderId());
            }

            FileEntity saved = fileApplicationService.uploadFile(
                    principal,
                    FileType.valueOf(request.getFileType().name()),
                    request.getOriginalName(),
                    request.getContentType(),
                    request.getContent().toByteArray(),
                    request.getIsShareable(),
                    folderId,
                    internalSource
            );
            responseObserver.onNext(FileGrpcResponseMapper.toResponse(saved));
            responseObserver.onCompleted();
        } catch (Exception exception) {
            responseObserver.onError(FileGrpcExceptionMapper.toStatusException(exception));
        }
    }

    @Override
    public StreamObserver<UploadFileChunk> uploadFileStream(StreamObserver<FileResponse> responseObserver) {
        final AuthenticatedPrincipal principal;
        final String internalSource;
        try {
            principal = FileGrpcPrincipalResolver.requirePrincipal();
            internalSource = GrpcContextKeys.INTERNAL_SOURCE.get();
        } catch (Exception exception) {
            responseObserver.onError(FileGrpcExceptionMapper.toStatusException(exception));
            return new StreamObserver<>() {
                @Override
                public void onNext(UploadFileChunk value) {
                }

                @Override
                public void onError(Throwable throwable) {
                }

                @Override
                public void onCompleted() {
                }
            };
        }

        meterRegistry.counter("file.upload.stream.started").increment();
        StreamingUploadState state = new StreamingUploadState(principal, internalSource);

        return new StreamObserver<>() {
            @Override
            public void onNext(UploadFileChunk request) {
                if (state.completed) {
                    return;
                }

                try {
                    if (shouldIgnoreChunk(state, request)) {
                        return;
                    }
                    initializeStreamIfNeeded(state, request);
                    validateUploadIdentity(state, request);

                    byte[] chunkData = request.getChunkData().toByteArray();
                    long nextBytesWritten = state.bytesWritten + chunkData.length;
                    fileApplicationService.appendUploadChunk(state.preparation, chunkData, nextBytesWritten, principal);
                    state.bytesWritten = nextBytesWritten;
                    if (chunkData.length > 0) {
                        meterRegistry.counter("file.upload.bytes.received").increment(chunkData.length);
                    }

                    state.nextChunkIndex++;
                    if (request.getLastChunk()) {
                        state.lastChunkReceived = true;
                    }
                } catch (Exception exception) {
                    recordFailure(state, exception);
                    state.completed = true;
                    responseObserver.onError(FileGrpcExceptionMapper.toStatusException(exception));
                }
            }

            @Override
            public void onError(Throwable throwable) {
                recordFailure(state, throwable);
                state.completed = true;
            }

            @Override
            public void onCompleted() {
                if (state.completed) {
                    return;
                }

                try {
                    if (state.preparation == null) {
                        throw new IllegalArgumentException("Upload stream did not contain any chunks");
                    }
                    if (!state.lastChunkReceived) {
                        throw new IllegalArgumentException("Upload stream ended before the final chunk marker");
                    }

                    FileEntity saved = fileApplicationService.completeUpload(state.preparation, state.bytesWritten, principal);
                    meterRegistry.counter("file.upload.stream.completed").increment();
                    state.completed = true;
                    responseObserver.onNext(FileGrpcResponseMapper.toResponse(saved));
                    responseObserver.onCompleted();
                } catch (Exception exception) {
                    recordFailure(state, exception);
                    state.completed = true;
                    responseObserver.onError(FileGrpcExceptionMapper.toStatusException(exception));
                }
            }
        };
    }

    @Override
    public void getFileMetadata(GetFileRequest request, StreamObserver<FileResponse> responseObserver) {
        try {
            AuthenticatedPrincipal principal = FileGrpcPrincipalResolver.requirePrincipal();
            FileEntity file = fileApplicationService.getMetadata(UUID.fromString(request.getFileId()), principal);
            responseObserver.onNext(FileGrpcResponseMapper.toResponse(file));
            responseObserver.onCompleted();
        } catch (Exception exception) {
            responseObserver.onError(FileGrpcExceptionMapper.toStatusException(exception));
        }
    }

    @Override
    public void deleteFile(DeleteFileRequest request, StreamObserver<SimpleResponse> responseObserver) {
        try {
            AuthenticatedPrincipal principal = FileGrpcPrincipalResolver.requirePrincipal();
            fileApplicationService.deleteFile(UUID.fromString(request.getFileId()), principal);
            responseObserver.onNext(SimpleResponse.newBuilder().setMessage("File deleted").build());
            responseObserver.onCompleted();
        } catch (Exception exception) {
            responseObserver.onError(FileGrpcExceptionMapper.toStatusException(exception));
        }
    }

    @Override
    public void shareFile(ShareFileRequest request, StreamObserver<SimpleResponse> responseObserver) {
        try {
            AuthenticatedPrincipal principal = FileGrpcPrincipalResolver.requirePrincipal();
            fileApplicationService.shareFile(
                    UUID.fromString(request.getFileId()),
                    UUID.fromString(request.getSharedWithUserId()),
                    principal
            );
            responseObserver.onNext(SimpleResponse.newBuilder().setMessage("File shared").build());
            responseObserver.onCompleted();
        } catch (Exception exception) {
            responseObserver.onError(FileGrpcExceptionMapper.toStatusException(exception));
        }
    }

    @Override
    public void unshareFile(UnshareFileRequest request, StreamObserver<SimpleResponse> responseObserver) {
        try {
            AuthenticatedPrincipal principal = FileGrpcPrincipalResolver.requirePrincipal();
            fileApplicationService.unshareFile(
                    UUID.fromString(request.getFileId()),
                    UUID.fromString(request.getSharedWithUserId()),
                    principal
            );
            responseObserver.onNext(SimpleResponse.newBuilder().setMessage("File unshared").build());
            responseObserver.onCompleted();
        } catch (Exception exception) {
            responseObserver.onError(FileGrpcExceptionMapper.toStatusException(exception));
        }
    }

    @Override
    public void updateFileMetadata(UpdateFileMetadataRequest request, StreamObserver<FileResponse> responseObserver) {
        try {
            AuthenticatedPrincipal principal = FileGrpcPrincipalResolver.requirePrincipal();
            FileEntity updated = fileApplicationService.updateFileMetadata(
                    UUID.fromString(request.getFileId()),
                    request.getIsShareable(),
                    principal
            );
            responseObserver.onNext(FileGrpcResponseMapper.toResponse(updated));
            responseObserver.onCompleted();
        } catch (Exception exception) {
            responseObserver.onError(FileGrpcExceptionMapper.toStatusException(exception));
        }
    }

    @Override
    public void listMyFiles(ListMyFilesRequest request, StreamObserver<ListFilesResponse> responseObserver) {
        try {
            AuthenticatedPrincipal principal = FileGrpcPrincipalResolver.requirePrincipal();
            FileType filterType = null;
            if (request.getFilterByType()) {
                filterType = FileType.valueOf(request.getFileType().name());
            }
            var filesPage = fileApplicationService.listMyFiles(
                    principal,
                    request.getPage(),
                    request.getSize() == 0 ? 20 : request.getSize(),
                    filterType,
                    request.getIncludeDeleted()
            );

            ListFilesResponse.Builder builder = ListFilesResponse.newBuilder().setTotal(filesPage.getTotalElements());
            filesPage.getContent().forEach(file -> builder.addFiles(FileGrpcResponseMapper.toResponse(file)));
            responseObserver.onNext(builder.build());
            responseObserver.onCompleted();
        } catch (Exception exception) {
            responseObserver.onError(FileGrpcExceptionMapper.toStatusException(exception));
        }
    }

    @Override
    public void listSharedWithMe(ListSharedWithMeRequest request, StreamObserver<ListFilesResponse> responseObserver) {
        try {
            AuthenticatedPrincipal principal = FileGrpcPrincipalResolver.requirePrincipal();
            var filesPage = fileApplicationService.listSharedWithMe(
                    principal,
                    request.getPage(),
                    request.getSize() == 0 ? 20 : request.getSize()
            );

            ListFilesResponse.Builder builder = ListFilesResponse.newBuilder().setTotal(filesPage.getTotalElements());
            filesPage.getContent().forEach(file -> builder.addFiles(FileGrpcResponseMapper.toResponse(file)));
            responseObserver.onNext(builder.build());
            responseObserver.onCompleted();
        } catch (Exception exception) {
            responseObserver.onError(FileGrpcExceptionMapper.toStatusException(exception));
        }
    }

    @Override
    public void getFilePath(GetFilePathRequest request, StreamObserver<FilePathResponse> responseObserver) {
        try {
            AuthenticatedPrincipal principal = FileGrpcPrincipalResolver.requirePrincipal();
            UUID fileId = UUID.fromString(request.getFileId());
            String path = fileApplicationService.getFilePath(fileId, principal);
            responseObserver.onNext(FilePathResponse.newBuilder().setFileId(fileId.toString()).setAbsolutePath(path).build());
            responseObserver.onCompleted();
        } catch (Exception exception) {
            responseObserver.onError(FileGrpcExceptionMapper.toStatusException(exception));
        }
    }

    @Override
    public void getFileContent(GetFileContentRequest request, StreamObserver<FileContentResponse> responseObserver) {
        try {
            AuthenticatedPrincipal principal = FileGrpcPrincipalResolver.requirePrincipal();
            UUID fileId = UUID.fromString(request.getFileId());
            var result = fileApplicationService.getFileContent(fileId, principal);

            FileContentResponse.Builder response = FileContentResponse.newBuilder()
                    .setFileId(result.file().getId().toString())
                    .setOriginalName(result.file().getOriginalName())
                    .setStoredName(result.file().getStoredName())
                    .setFileSize(result.file().getFileSize())
                    .setContent(ByteString.copyFrom(result.content()));

            if (result.file().getContentType() != null) {
                response.setContentType(result.file().getContentType());
            }

            responseObserver.onNext(response.build());
            responseObserver.onCompleted();
        } catch (Exception exception) {
            responseObserver.onError(FileGrpcExceptionMapper.toStatusException(exception));
        }
    }

    private boolean shouldIgnoreChunk(StreamingUploadState state, UploadFileChunk request) {
        if (request.getChunkIndex() < 0) {
            throw new IllegalArgumentException("chunkIndex must be non-negative");
        }
        if (state.lastChunkReceived) {
            throw new IllegalArgumentException("No chunks are allowed after lastChunk=true");
        }
        if (request.getChunkIndex() < state.nextChunkIndex) {
            return true;
        }
        if (request.getChunkIndex() > state.nextChunkIndex) {
            throw new IllegalArgumentException("Upload chunks must arrive in order");
        }
        return false;
    }

    private void initializeStreamIfNeeded(StreamingUploadState state, UploadFileChunk request) {
        if (state.preparation != null || request.getChunkIndex() < state.nextChunkIndex) {
            return;
        }

        if (request.getUploadId() == null || request.getUploadId().isBlank()) {
            throw new IllegalArgumentException("uploadId is required");
        }

        UUID folderId = null;
        if (request.getFolderId() != null && !request.getFolderId().isBlank()) {
            folderId = UUID.fromString(request.getFolderId());
        }

        state.uploadId = request.getUploadId();
        state.preparation = fileApplicationService.prepareUpload(
                state.principal,
                FileType.valueOf(request.getFileType().name()),
                request.getFileName(),
                request.getContentType(),
                request.getIsShareable(),
                folderId,
                state.internalSource,
                request.getUploadId()
        );
    }

    private void validateUploadIdentity(StreamingUploadState state, UploadFileChunk request) {
        if (state.uploadId == null) {
            return;
        }
        if (request.getUploadId() == null || request.getUploadId().isBlank()) {
            throw new IllegalArgumentException("uploadId is required for every chunk");
        }
        if (!state.uploadId.equals(request.getUploadId())) {
            throw new IllegalArgumentException("All chunks in a stream must use the same uploadId");
        }
    }

    private void recordFailure(StreamingUploadState state, Throwable throwable) {
        if (state.failureRecorded) {
            return;
        }

        state.failureRecorded = true;
        meterRegistry.counter("file.upload.stream.failed").increment();
        String reason = throwable == null || throwable.getMessage() == null || throwable.getMessage().isBlank()
                ? "Upload stream failed"
                : throwable.getMessage();
        fileApplicationService.markUploadFailed(state.preparation, state.principal, reason);
    }

    private static final class StreamingUploadState {

        private final AuthenticatedPrincipal principal;
        private final String internalSource;
        private FileApplicationService.UploadPreparation preparation;
        private String uploadId;
        private long nextChunkIndex;
        private long bytesWritten;
        private boolean lastChunkReceived;
        private boolean completed;
        private boolean failureRecorded;

        private StreamingUploadState(AuthenticatedPrincipal principal, String internalSource) {
            this.principal = principal;
            this.internalSource = internalSource;
        }
    }
}
