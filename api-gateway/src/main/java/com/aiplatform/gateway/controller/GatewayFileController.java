package com.aiplatform.gateway.controller;

import com.aiplatform.file.proto.DeleteFileRequest;
import com.aiplatform.file.proto.DeleteFolderRequest;
import com.aiplatform.file.proto.CreateFolderRequest;
import com.aiplatform.file.proto.FileServiceGrpc;
import com.aiplatform.file.proto.GetFileContentRequest;
import com.aiplatform.file.proto.GetFilePathRequest;
import com.aiplatform.file.proto.GetFileRequest;
import com.aiplatform.file.proto.ListMyFoldersRequest;
import com.aiplatform.file.proto.ListMyFilesRequest;
import com.aiplatform.file.proto.ListSharedFoldersRequest;
import com.aiplatform.file.proto.ListSharedWithMeRequest;
import com.aiplatform.file.proto.ShareFolderRequest;
import com.aiplatform.file.proto.ShareFileRequest;
import com.aiplatform.file.proto.UnshareFolderRequest;
import com.aiplatform.file.proto.UnshareFileRequest;
import com.aiplatform.file.proto.UpdateFolderRequest;
import com.aiplatform.file.proto.UpdateFileMetadataRequest;
import com.aiplatform.file.proto.UploadFileChunk;
import com.aiplatform.file.proto.UploadFileRequest;
import com.aiplatform.gateway.config.GrpcFileProperties;
import com.aiplatform.gateway.dto.ApiMessageResponse;
import com.aiplatform.gateway.dto.FileMetadataUpdateRequest;
import com.aiplatform.gateway.dto.FileResponse;
import com.aiplatform.gateway.dto.FileShareRequest;
import com.aiplatform.gateway.dto.FileUploadRequest;
import com.aiplatform.gateway.dto.FolderCreateRequest;
import com.aiplatform.gateway.dto.FolderResponse;
import com.aiplatform.gateway.dto.FolderShareRequest;
import com.aiplatform.gateway.dto.FolderUpdateRequest;
import com.aiplatform.gateway.dto.ListFoldersResponse;
import com.aiplatform.gateway.dto.ListFilesResponse;
import com.aiplatform.gateway.security.JwtValidationService;
import com.aiplatform.gateway.util.GatewayPrincipal;
import com.aiplatform.gateway.util.GatewayPrincipalResolver;
import com.aiplatform.gateway.util.GatewayRequestUtils;
import com.aiplatform.gateway.util.GrpcExceptionMapper;
import com.aiplatform.gateway.util.mapper.FileResponseMapper;
import com.aiplatform.gateway.util.mapper.FolderResponseMapper;
import com.google.protobuf.ByteString;
import io.grpc.Metadata;
import io.grpc.Status;
import io.grpc.stub.StreamObserver;
import io.grpc.stub.MetadataUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import net.devh.boot.grpc.client.inject.GrpcClient;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.core.io.buffer.DataBufferUtils;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.MediaTypeFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.http.codec.multipart.FilePart;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.Disposable;
import reactor.core.publisher.Mono;
import reactor.core.publisher.SynchronousSink;
import reactor.core.scheduler.Schedulers;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;

@RestController
@RequestMapping("/api/internal/files")
@RequiredArgsConstructor
public class GatewayFileController {

        private static final int GRPC_UPLOAD_CHUNK_SIZE = 64 * 1024;

    private static final Metadata.Key<String> CORRELATION_ID_KEY = Metadata.Key.of("x-correlation-id", Metadata.ASCII_STRING_MARSHALLER);
    private static final Metadata.Key<String> SERVICE_SECRET_KEY = Metadata.Key.of("x-service-secret", Metadata.ASCII_STRING_MARSHALLER);
    private static final Metadata.Key<String> USER_ID_KEY = Metadata.Key.of("x-user-id", Metadata.ASCII_STRING_MARSHALLER);
    private static final Metadata.Key<String> USER_ROLES_KEY = Metadata.Key.of("x-roles", Metadata.ASCII_STRING_MARSHALLER);
    private static final Metadata.Key<String> UNIVERSITY_ID_KEY = Metadata.Key.of("x-university-id", Metadata.ASCII_STRING_MARSHALLER);

    @GrpcClient("file-service")
    private FileServiceGrpc.FileServiceBlockingStub fileStub;

        @GrpcClient("file-service")
        private FileServiceGrpc.FileServiceStub fileAsyncStub;

    private final GrpcFileProperties grpcFileProperties;
    private final JwtValidationService jwtValidationService;

        @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Mono<ResponseEntity<FileResponse>> uploadFile(
                        @RequestPart("file") FilePart file,
                        @RequestPart("fileType") String fileType,
                        @RequestPart("folderId") String folderId,
                        @RequestPart(value = "isShareable", required = false) String isShareable,
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader
    ) {
                return Mono.defer(() -> {
                                        GatewayPrincipal principal = resolvePrincipal(authorization, correlationHeader);
                                        com.aiplatform.file.proto.FileType resolvedFileType = parseFileType(fileType);
                                        String resolvedFolderId = requireFolderId(folderId);
                                        boolean resolvedShareable = parseIsShareable(isShareable);
                                        return streamUpload(file, resolvedFileType, resolvedFolderId, resolvedShareable, principal)
                                                        .map(response -> ResponseEntity.ok(FileResponseMapper.toDto(response)));
                                })
                .onErrorMap(GrpcExceptionMapper::toResponseStatus);
    }

        @Deprecated
        @PostMapping(path = "/base64-upload")
        public Mono<ResponseEntity<FileResponse>> uploadFileBase64(
                        @Valid @RequestBody FileUploadRequest request,
                        @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
                        @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader
        ) {
                return Mono.fromCallable(() -> {
                                        GatewayPrincipal principal = resolvePrincipal(authorization, correlationHeader);
                                        byte[] content;
                                        try {
                                                content = Base64.getDecoder().decode(request.contentBase64());
                                        } catch (IllegalArgumentException exception) {
                                                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "contentBase64 must be valid Base64", exception);
                                        }

                                        UploadFileRequest grpcRequest = UploadFileRequest.newBuilder()
                                                        .setFileType(request.fileType())
                                                        .setFolderId(request.folderId())
                                                        .setOriginalName(request.originalName())
                                                        .setContentType(GatewayRequestUtils.defaultString(request.contentType()))
                                                        .setContent(ByteString.copyFrom(content))
                                                        .setIsShareable(request.isShareable())
                                                        .build();

                                        var response = withMetadata(principal).uploadFile(grpcRequest);
                                        return ResponseEntity.ok(FileResponseMapper.toDto(response));
                                })
                                .subscribeOn(Schedulers.boundedElastic())
                                .onErrorMap(GrpcExceptionMapper::toResponseStatus);
        }

    @PostMapping("/folders")
    public Mono<ResponseEntity<FolderResponse>> createFolder(
            @Valid @RequestBody FolderCreateRequest request,
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader
    ) {
        return Mono.fromCallable(() -> {
                    GatewayPrincipal principal = resolvePrincipal(authorization, correlationHeader);
                    var response = withMetadata(principal)
                            .createFolder(CreateFolderRequest.newBuilder()
                                    .setName(request.name())
                                    .setParentId(GatewayRequestUtils.defaultString(request.parentId()))
                                    .build());
                    return ResponseEntity.ok(FolderResponseMapper.toDto(response));
                })
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorMap(GrpcExceptionMapper::toResponseStatus);
    }

    @PutMapping("/folders/{folderId}")
    public Mono<ResponseEntity<FolderResponse>> updateFolder(
            @PathVariable String folderId,
            @Valid @RequestBody FolderUpdateRequest request,
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader
    ) {
        return Mono.fromCallable(() -> {
                    GatewayPrincipal principal = resolvePrincipal(authorization, correlationHeader);
                    var response = withMetadata(principal)
                            .updateFolder(UpdateFolderRequest.newBuilder()
                                    .setFolderId(folderId)
                                    .setName(request.name())
                                    .build());
                    return ResponseEntity.ok(FolderResponseMapper.toDto(response));
                })
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorMap(GrpcExceptionMapper::toResponseStatus);
    }

    @DeleteMapping("/folders/{folderId}")
    public Mono<ResponseEntity<ApiMessageResponse>> deleteFolder(
            @PathVariable String folderId,
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader
    ) {
        return Mono.fromCallable(() -> {
                    GatewayPrincipal principal = resolvePrincipal(authorization, correlationHeader);
                    var response = withMetadata(principal)
                            .deleteFolder(DeleteFolderRequest.newBuilder().setFolderId(folderId).build());
                    return ResponseEntity.ok(new ApiMessageResponse(response.getMessage()));
                })
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorMap(GrpcExceptionMapper::toResponseStatus);
    }

    @PostMapping("/folders/{folderId}/share")
    public Mono<ResponseEntity<ApiMessageResponse>> shareFolder(
            @PathVariable String folderId,
            @Valid @RequestBody FolderShareRequest request,
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader
    ) {
        return Mono.fromCallable(() -> {
                    GatewayPrincipal principal = resolvePrincipal(authorization, correlationHeader);
                    var response = withMetadata(principal)
                            .shareFolder(ShareFolderRequest.newBuilder()
                                    .setFolderId(folderId)
                                    .setSharedWithUserId(request.sharedWithUserId())
                                    .build());
                    return ResponseEntity.ok(new ApiMessageResponse(response.getMessage()));
                })
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorMap(GrpcExceptionMapper::toResponseStatus);
    }

    @DeleteMapping("/folders/{folderId}/share/{userId}")
    public Mono<ResponseEntity<ApiMessageResponse>> unshareFolder(
            @PathVariable String folderId,
            @PathVariable String userId,
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader
    ) {
        return Mono.fromCallable(() -> {
                    GatewayPrincipal principal = resolvePrincipal(authorization, correlationHeader);
                    var response = withMetadata(principal)
                            .unshareFolder(UnshareFolderRequest.newBuilder()
                                    .setFolderId(folderId)
                                    .setSharedWithUserId(userId)
                                    .build());
                    return ResponseEntity.ok(new ApiMessageResponse(response.getMessage()));
                })
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorMap(GrpcExceptionMapper::toResponseStatus);
    }

    @GetMapping("/folders")
    public Mono<ResponseEntity<ListFoldersResponse>> listMyFolders(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return Mono.fromCallable(() -> {
                    GatewayPrincipal principal = resolvePrincipal(authorization, correlationHeader);
                    var response = withMetadata(principal)
                            .listMyFolders(ListMyFoldersRequest.newBuilder()
                                    .setPage(Math.max(page, 0))
                                    .setSize(Math.max(size, 1))
                                    .build());
                    List<FolderResponse> folders = response.getFoldersList().stream().map(FolderResponseMapper::toDto).toList();
                    return ResponseEntity.ok(new ListFoldersResponse(folders, response.getTotal()));
                })
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorMap(GrpcExceptionMapper::toResponseStatus);
    }

    @GetMapping("/folders/shared")
    public Mono<ResponseEntity<ListFoldersResponse>> listSharedFolders(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return Mono.fromCallable(() -> {
                    GatewayPrincipal principal = resolvePrincipal(authorization, correlationHeader);
                    var response = withMetadata(principal)
                            .listSharedFolders(ListSharedFoldersRequest.newBuilder()
                                    .setPage(Math.max(page, 0))
                                    .setSize(Math.max(size, 1))
                                    .build());
                    List<FolderResponse> folders = response.getFoldersList().stream().map(FolderResponseMapper::toDto).toList();
                    return ResponseEntity.ok(new ListFoldersResponse(folders, response.getTotal()));
                })
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorMap(GrpcExceptionMapper::toResponseStatus);
    }

    @GetMapping("/{fileId}")
    public Mono<ResponseEntity<FileResponse>> getFileMetadata(
            @PathVariable String fileId,
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader
    ) {
        return Mono.fromCallable(() -> {
                    GatewayPrincipal principal = resolvePrincipal(authorization, correlationHeader);
                    var response = withMetadata(principal)
                            .getFileMetadata(GetFileRequest.newBuilder().setFileId(fileId).build());
                    return ResponseEntity.ok(FileResponseMapper.toDto(response));
                })
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorMap(GrpcExceptionMapper::toResponseStatus);
    }

    @DeleteMapping("/{fileId}")
    public Mono<ResponseEntity<ApiMessageResponse>> deleteFile(
            @PathVariable String fileId,
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader
    ) {
        return Mono.fromCallable(() -> {
                    GatewayPrincipal principal = resolvePrincipal(authorization, correlationHeader);
                    var response = withMetadata(principal)
                            .deleteFile(DeleteFileRequest.newBuilder().setFileId(fileId).build());
                    return ResponseEntity.ok(new ApiMessageResponse(response.getMessage()));
                })
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorMap(GrpcExceptionMapper::toResponseStatus);
    }

    @PostMapping("/{fileId}/share")
    public Mono<ResponseEntity<ApiMessageResponse>> shareFile(
            @PathVariable String fileId,
            @Valid @RequestBody FileShareRequest request,
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader
    ) {
        return Mono.fromCallable(() -> {
                    GatewayPrincipal principal = resolvePrincipal(authorization, correlationHeader);
                    var response = withMetadata(principal)
                            .shareFile(ShareFileRequest.newBuilder()
                                    .setFileId(fileId)
                                    .setSharedWithUserId(request.sharedWithUserId())
                                    .build());
                    return ResponseEntity.ok(new ApiMessageResponse(response.getMessage()));
                })
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorMap(GrpcExceptionMapper::toResponseStatus);
    }

    @PostMapping("/{fileId}/unshare")
    public Mono<ResponseEntity<ApiMessageResponse>> unshareFile(
            @PathVariable String fileId,
            @Valid @RequestBody FileShareRequest request,
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader
    ) {
        return Mono.fromCallable(() -> {
                    GatewayPrincipal principal = resolvePrincipal(authorization, correlationHeader);
                    var response = withMetadata(principal)
                            .unshareFile(UnshareFileRequest.newBuilder()
                                    .setFileId(fileId)
                                    .setSharedWithUserId(request.sharedWithUserId())
                                    .build());
                    return ResponseEntity.ok(new ApiMessageResponse(response.getMessage()));
                })
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorMap(GrpcExceptionMapper::toResponseStatus);
    }

    @PatchMapping("/{fileId}/metadata")
    public Mono<ResponseEntity<FileResponse>> updateMetadata(
            @PathVariable String fileId,
            @Valid @RequestBody FileMetadataUpdateRequest request,
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader
    ) {
        return Mono.fromCallable(() -> {
                    GatewayPrincipal principal = resolvePrincipal(authorization, correlationHeader);
                    var response = withMetadata(principal)
                            .updateFileMetadata(UpdateFileMetadataRequest.newBuilder()
                                    .setFileId(fileId)
                                    .setIsShareable(request.isShareable())
                                    .build());
                    return ResponseEntity.ok(FileResponseMapper.toDto(response));
                })
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorMap(GrpcExceptionMapper::toResponseStatus);
    }

    @GetMapping("/my")
    public Mono<ResponseEntity<ListFilesResponse>> listMyFiles(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) com.aiplatform.file.proto.FileType fileType,
            @RequestParam(defaultValue = "false") boolean includeDeleted
    ) {
        return Mono.fromCallable(() -> {
                    GatewayPrincipal principal = resolvePrincipal(authorization, correlationHeader);
                    ListMyFilesRequest.Builder requestBuilder = ListMyFilesRequest.newBuilder()
                            .setPage(Math.max(page, 0))
                            .setSize(Math.max(size, 1))
                            .setIncludeDeleted(includeDeleted);
                    if (fileType != null) {
                        requestBuilder.setFileType(fileType).setFilterByType(true);
                    }

                    var response = withMetadata(principal).listMyFiles(requestBuilder.build());
                    List<FileResponse> files = response.getFilesList().stream().map(FileResponseMapper::toDto).toList();
                    return ResponseEntity.ok(new ListFilesResponse(files, response.getTotal()));
                })
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorMap(GrpcExceptionMapper::toResponseStatus);
    }

    @GetMapping("/shared-with-me")
    public Mono<ResponseEntity<ListFilesResponse>> listSharedWithMe(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return Mono.fromCallable(() -> {
                    GatewayPrincipal principal = resolvePrincipal(authorization, correlationHeader);
                    var response = withMetadata(principal)
                            .listSharedWithMe(ListSharedWithMeRequest.newBuilder()
                                    .setPage(Math.max(page, 0))
                                    .setSize(Math.max(size, 1))
                                    .build());
                    List<FileResponse> files = response.getFilesList().stream().map(FileResponseMapper::toDto).toList();
                    return ResponseEntity.ok(new ListFilesResponse(files, response.getTotal()));
                })
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorMap(GrpcExceptionMapper::toResponseStatus);
    }

    @GetMapping("/{fileId}/path")
    public Mono<ResponseEntity<String>> getFilePath(
            @PathVariable String fileId,
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader
    ) {
        return Mono.fromCallable(() -> {
                    GatewayPrincipal principal = resolvePrincipal(authorization, correlationHeader);
                    var response = withMetadata(principal)
                            .getFilePath(GetFilePathRequest.newBuilder().setFileId(fileId).build());
                    return ResponseEntity.ok(response.getAbsolutePath());
                })
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorMap(GrpcExceptionMapper::toResponseStatus);
    }

    @GetMapping("/{fileId}/preview")
    public Mono<ResponseEntity<byte[]>> previewFile(
            @PathVariable String fileId,
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader
    ) {
        return Mono.<ResponseEntity<byte[]>>fromCallable(() -> {
                    GatewayPrincipal principal = resolvePrincipal(authorization, correlationHeader);
                    var response = withMetadata(principal)
                            .getFileContent(GetFileContentRequest.newBuilder().setFileId(fileId).build());

                    String fileName = preferredFileName(response.getOriginalName(), response.getStoredName(), fileId);
                    MediaType mediaType = resolveMediaType(response.getContentType(), fileName);
                    byte[] content = response.getContent().toByteArray();

                    return ResponseEntity.ok()
                            .contentType(mediaType)
                            .contentLength(content.length)
                            .header(HttpHeaders.CONTENT_DISPOSITION,
                                    ContentDisposition.builder("inline")
                                            .filename(fileName, StandardCharsets.UTF_8)
                                            .build()
                                            .toString())
                            .header(HttpHeaders.CACHE_CONTROL, "no-store")
                            .header("X-Content-Type-Options", "nosniff")
                            .body(content);
                })
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorMap(GrpcExceptionMapper::toResponseStatus);
    }

    private FileServiceGrpc.FileServiceBlockingStub withMetadata(GatewayPrincipal principal) {
        Metadata metadata = new Metadata();
        metadata.put(CORRELATION_ID_KEY, principal.correlationId());
        metadata.put(SERVICE_SECRET_KEY, grpcFileProperties.getServiceSecret());
        metadata.put(USER_ID_KEY, principal.userId());
        if (!principal.roles().isBlank()) {
            metadata.put(USER_ROLES_KEY, principal.roles());
        }
        if (!principal.universityId().isBlank()) {
            metadata.put(UNIVERSITY_ID_KEY, principal.universityId());
        }
        return fileStub.withInterceptors(MetadataUtils.newAttachHeadersInterceptor(metadata));
    }

        private FileServiceGrpc.FileServiceStub withMetadata(GatewayPrincipal principal, FileServiceGrpc.FileServiceStub stub) {
                Metadata metadata = new Metadata();
                metadata.put(CORRELATION_ID_KEY, principal.correlationId());
                metadata.put(SERVICE_SECRET_KEY, grpcFileProperties.getServiceSecret());
                metadata.put(USER_ID_KEY, principal.userId());
                if (!principal.roles().isBlank()) {
                        metadata.put(USER_ROLES_KEY, principal.roles());
                }
                if (!principal.universityId().isBlank()) {
                        metadata.put(UNIVERSITY_ID_KEY, principal.universityId());
                }
                return stub.withInterceptors(MetadataUtils.newAttachHeadersInterceptor(metadata));
        }

    private GatewayPrincipal resolvePrincipal(String authorization, String correlationHeader) {
        return GatewayPrincipalResolver.resolve(authorization, correlationHeader, jwtValidationService);
    }

        private Mono<com.aiplatform.file.proto.FileResponse> streamUpload(FilePart file,
                                                                                                                                          com.aiplatform.file.proto.FileType fileType,
                                                                                                                                          String folderId,
                                                                                                                                          boolean isShareable,
                                                                                                                                          GatewayPrincipal principal) {
                String uploadId = UUID.randomUUID().toString();
                String fileName = preferredFileName(file.filename(), null, uploadId);
                MediaType partContentType = file.headers().getContentType();
                String contentType = partContentType != null ? partContentType.toString() : null;

                return Mono.create(sink -> {
                        AtomicLong chunkIndex = new AtomicLong();
                        AtomicBoolean terminal = new AtomicBoolean();

                        StreamObserver<UploadFileChunk> requestObserver = withMetadata(principal, fileAsyncStub)
                                        .uploadFileStream(new StreamObserver<>() {
                                                @Override
                                                public void onNext(com.aiplatform.file.proto.FileResponse value) {
                                                        if (terminal.compareAndSet(false, true)) {
                                                                sink.success(value);
                                                        }
                                                }

                                                @Override
                                                public void onError(Throwable throwable) {
                                                        if (terminal.compareAndSet(false, true)) {
                                                                sink.error(throwable);
                                                        }
                                                }

                                                @Override
                                                public void onCompleted() {
                                                }
                                        });

                        Disposable subscription = file.content()
                                        .handle((DataBuffer dataBuffer, SynchronousSink<byte[]> downstream) -> emitUploadChunks(dataBuffer, downstream))
                                        .doOnNext(bytes -> {
                                                long nextIndex = chunkIndex.getAndIncrement();
                                                requestObserver.onNext(buildUploadChunk(
                                                                uploadId,
                                                                fileName,
                                                                contentType,
                                                                fileType,
                                                                folderId,
                                                                isShareable,
                                                                bytes,
                                                                nextIndex,
                                                                false
                                                ));
                                        })
                                        .doOnComplete(() -> {
                                                if (chunkIndex.get() == 0) {
                                                        Throwable error = Status.INVALID_ARGUMENT
                                                                        .withDescription("Uploaded file content is empty")
                                                                        .asRuntimeException();
                                                        requestObserver.onError(error);
                                                        if (terminal.compareAndSet(false, true)) {
                                                                sink.error(error);
                                                        }
                                                        return;
                                                }

                                                requestObserver.onNext(buildUploadChunk(
                                                                uploadId,
                                                                fileName,
                                                                contentType,
                                                                fileType,
                                                                folderId,
                                                                isShareable,
                                                                new byte[0],
                                                                chunkIndex.getAndIncrement(),
                                                                true
                                                ));
                                                requestObserver.onCompleted();
                                        })
                                        .doOnError(throwable -> {
                                                Throwable transportError = throwable instanceof RuntimeException
                                                                ? throwable
                                                                : new RuntimeException(throwable);
                                                requestObserver.onError(transportError);
                                                if (terminal.compareAndSet(false, true)) {
                                                        sink.error(transportError);
                                                }
                                        })
                                        .subscribe();

                        sink.onCancel(() -> {
                                subscription.dispose();
                                requestObserver.onError(Status.CANCELLED.withDescription("Client cancelled upload").asRuntimeException());
                        });
                        sink.onDispose(subscription::dispose);
                });
        }

        private void emitUploadChunks(DataBuffer dataBuffer, SynchronousSink<byte[]> downstream) {
                try {
                        while (dataBuffer.readableByteCount() > 0) {
                                int chunkSize = Math.min(dataBuffer.readableByteCount(), GRPC_UPLOAD_CHUNK_SIZE);
                                byte[] chunk = new byte[chunkSize];
                                dataBuffer.read(chunk);
                                downstream.next(chunk);
                        }
                } finally {
                        DataBufferUtils.release(dataBuffer);
                }
        }

        private UploadFileChunk buildUploadChunk(String uploadId,
                                                                                         String fileName,
                                                                                         String contentType,
                                                                                         com.aiplatform.file.proto.FileType fileType,
                                                                                         String folderId,
                                                                                         boolean isShareable,
                                                                                         byte[] chunkData,
                                                                                         long chunkIndex,
                                                                                         boolean lastChunk) {
                UploadFileChunk.Builder builder = UploadFileChunk.newBuilder()
                                .setUploadId(uploadId)
                                .setChunkIndex(chunkIndex)
                                .setLastChunk(lastChunk);

                if (chunkData.length > 0) {
                        builder.setChunkData(ByteString.copyFrom(chunkData));
                }

                if (chunkIndex == 0) {
                        builder.setFileName(fileName)
                                        .setFileType(fileType)
                                        .setFolderId(folderId)
                                        .setIsShareable(isShareable);
                        if (contentType != null && !contentType.isBlank()) {
                                builder.setContentType(contentType);
                        }
                }

                return builder.build();
        }

        private com.aiplatform.file.proto.FileType parseFileType(String rawFileType) {
                if (rawFileType == null || rawFileType.isBlank()) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "fileType is required");
                }
                try {
                        return com.aiplatform.file.proto.FileType.valueOf(rawFileType.trim().toUpperCase(Locale.ROOT));
                } catch (IllegalArgumentException exception) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "fileType is invalid", exception);
                }
        }

        private String requireFolderId(String folderId) {
                if (folderId == null || folderId.isBlank()) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "folderId is required");
                }
                return folderId.trim();
        }

        private boolean parseIsShareable(String isShareable) {
                if (isShareable == null || isShareable.isBlank()) {
                        return false;
                }
                String normalized = isShareable.trim().toLowerCase(Locale.ROOT);
                if ("true".equals(normalized)) {
                        return true;
                }
                if ("false".equals(normalized)) {
                        return false;
                }
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "isShareable must be true or false");
        }

        private MediaType resolveMediaType(String contentType, String fileName) {
                if (contentType != null && !contentType.isBlank()) {
                        try {
                                return MediaType.parseMediaType(contentType);
                        } catch (IllegalArgumentException ignored) {
                        }
                }
                return MediaTypeFactory.getMediaType(fileName).orElse(MediaType.APPLICATION_OCTET_STREAM);
        }

        private String preferredFileName(String originalName, String storedName, String fallback) {
                if (originalName != null && !originalName.isBlank()) {
                        return originalName;
                }
                if (storedName != null && !storedName.isBlank()) {
                        return storedName;
                }
                return fallback;
        }
}
