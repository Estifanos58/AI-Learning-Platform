package com.aiplatform.gateway.controller;

import com.aiplatform.gateway.config.GrpcRagProperties;
import com.aiplatform.gateway.dto.RagCancelResponse;
import com.aiplatform.gateway.dto.RagCollectionInfoResponse;
import com.aiplatform.gateway.dto.RagDeleteVectorsResponse;
import com.aiplatform.gateway.dto.RagIngestRequest;
import com.aiplatform.gateway.dto.RagIngestResponse;
import com.aiplatform.gateway.dto.RagProvidersResponse;
import com.aiplatform.gateway.dto.RagRetrieveChunkResponse;
import com.aiplatform.gateway.dto.RagRetrieveRequest;
import com.aiplatform.gateway.dto.RagRetrieveResponse;
import com.aiplatform.gateway.security.JwtValidationService;
import com.aiplatform.gateway.util.GatewayPrincipal;
import com.aiplatform.gateway.util.GatewayPrincipalResolver;
import com.aiplatform.gateway.util.GrpcExceptionMapper;
import com.aiplatform.rag.proto.CancelGenerationRequest;
import com.aiplatform.rag.proto.CollectionInfoRequest;
import com.aiplatform.rag.proto.DeleteFileVectorsRequest;
import com.aiplatform.rag.proto.IngestFileRequest;
import com.aiplatform.rag.proto.ListProvidersRequest;
import com.aiplatform.rag.proto.RagServiceGrpc;
import com.aiplatform.rag.proto.RetrieveChunksRequest;
import io.grpc.Metadata;
import io.grpc.stub.MetadataUtils;
import jakarta.validation.Valid;
import net.devh.boot.grpc.client.inject.GrpcClient;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.util.List;

@RestController
@RequestMapping("/api/internal/rag")
public class GatewayRagController {

    private static final Metadata.Key<String> CORRELATION_ID_KEY = Metadata.Key.of("x-correlation-id", Metadata.ASCII_STRING_MARSHALLER);
    private static final Metadata.Key<String> SERVICE_SECRET_KEY = Metadata.Key.of("x-service-secret", Metadata.ASCII_STRING_MARSHALLER);
    private static final Metadata.Key<String> USER_ID_KEY = Metadata.Key.of("x-user-id", Metadata.ASCII_STRING_MARSHALLER);

    @GrpcClient("rag-service")
    private RagServiceGrpc.RagServiceBlockingStub ragStub;

    private final GrpcRagProperties grpcRagProperties;
    private final JwtValidationService jwtValidationService;

    public GatewayRagController(GrpcRagProperties grpcRagProperties, JwtValidationService jwtValidationService) {
        this.grpcRagProperties = grpcRagProperties;
        this.jwtValidationService = jwtValidationService;
    }

    @PostMapping("/ingest")
    public Mono<ResponseEntity<RagIngestResponse>> ingest(
            @Valid @RequestBody RagIngestRequest request,
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader
    ) {
        return Mono.fromCallable(() -> {
                    GatewayPrincipal principal = resolvePrincipal(authorization, correlationHeader);
                    IngestFileRequest.Builder grpcRequest = IngestFileRequest.newBuilder()
                            .setFileId(request.fileId())
                            .setOwnerId(request.ownerId() == null || request.ownerId().isBlank() ? principal.userId() : request.ownerId())
                            .setStoragePath(request.storagePath())
                            .setContentType(request.contentType())
                            .setFileName(request.fileName() == null ? "" : request.fileName());

                    if (request.folderId() != null) {
                        grpcRequest.setFolderId(request.folderId());
                    }
                    if (request.tags() != null && !request.tags().isEmpty()) {
                        grpcRequest.addAllTags(request.tags());
                    }

                    var response = withMetadata(principal).ingestFile(grpcRequest.build());
                    return ResponseEntity.status(HttpStatus.ACCEPTED)
                            .body(new RagIngestResponse(response.getStatus(), response.getFileId(), response.getChunksStored()));
                })
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorMap(GrpcExceptionMapper::toResponseStatus);
    }

    @PostMapping("/retrieve")
    public Mono<ResponseEntity<RagRetrieveResponse>> retrieve(
            @Valid @RequestBody RagRetrieveRequest request,
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader
    ) {
        return Mono.fromCallable(() -> {
                    GatewayPrincipal principal = resolvePrincipal(authorization, correlationHeader);
                    RetrieveChunksRequest.Builder grpcRequest = RetrieveChunksRequest.newBuilder()
                            .setQuery(request.query());

                    if (request.fileIds() != null && !request.fileIds().isEmpty()) {
                        grpcRequest.addAllFileIds(request.fileIds());
                    }
                    if (request.topK() != null) {
                        grpcRequest.setTopK(request.topK());
                    }

                    var response = withMetadata(principal).retrieveChunks(grpcRequest.build());
                    List<RagRetrieveChunkResponse> chunks = response.getChunksList().stream()
                            .map(chunk -> new RagRetrieveChunkResponse(
                                    chunk.getScore(),
                                    chunk.getFileId(),
                                    chunk.getPageNumber(),
                                    chunk.getChunkTextPreview()
                            ))
                            .toList();

                    return ResponseEntity.ok(new RagRetrieveResponse(
                            response.getQuery(),
                            response.getChunkCount(),
                            chunks
                    ));
                })
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorMap(GrpcExceptionMapper::toResponseStatus);
    }

    @DeleteMapping("/vectors/{fileId}")
    public Mono<ResponseEntity<RagDeleteVectorsResponse>> deleteVectors(
            @PathVariable String fileId,
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader
    ) {
        return Mono.fromCallable(() -> {
                    GatewayPrincipal principal = resolvePrincipal(authorization, correlationHeader);
                    var response = withMetadata(principal).deleteFileVectors(
                            DeleteFileVectorsRequest.newBuilder().setFileId(fileId).build()
                    );
                    return ResponseEntity.ok(new RagDeleteVectorsResponse(response.getStatus(), response.getFileId()));
                })
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorMap(GrpcExceptionMapper::toResponseStatus);
    }

    @PostMapping("/cancel/{requestId}")
    public Mono<ResponseEntity<RagCancelResponse>> cancel(
            @PathVariable String requestId,
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader
    ) {
        return Mono.fromCallable(() -> {
                    GatewayPrincipal principal = resolvePrincipal(authorization, correlationHeader);
                    var response = withMetadata(principal).cancelGeneration(
                            CancelGenerationRequest.newBuilder().setRequestId(requestId).build()
                    );
                    return ResponseEntity.ok(new RagCancelResponse(response.getStatus(), response.getRequestId()));
                })
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorMap(GrpcExceptionMapper::toResponseStatus);
    }

    @GetMapping("/providers")
    public Mono<ResponseEntity<RagProvidersResponse>> providers(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader
    ) {
        return Mono.fromCallable(() -> {
                    GatewayPrincipal principal = resolvePrincipal(authorization, correlationHeader);
                    var response = withMetadata(principal).listProviders(ListProvidersRequest.newBuilder().build());
                    return ResponseEntity.ok(new RagProvidersResponse(response.getAvailableProvidersList()));
                })
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorMap(GrpcExceptionMapper::toResponseStatus);
    }

    @GetMapping("/collection/info")
    public Mono<ResponseEntity<RagCollectionInfoResponse>> collectionInfo(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader
    ) {
        return Mono.fromCallable(() -> {
                    GatewayPrincipal principal = resolvePrincipal(authorization, correlationHeader);
                    var response = withMetadata(principal).collectionInfo(CollectionInfoRequest.newBuilder().build());
                    return ResponseEntity.ok(new RagCollectionInfoResponse(
                            response.getCollection(),
                            response.getVectorsCount(),
                            response.getStatus(),
                            response.getError().isBlank() ? null : response.getError()
                    ));
                })
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorMap(GrpcExceptionMapper::toResponseStatus);
    }

    private RagServiceGrpc.RagServiceBlockingStub withMetadata(GatewayPrincipal principal) {
        Metadata metadata = new Metadata();
        metadata.put(CORRELATION_ID_KEY, principal.correlationId());
        metadata.put(SERVICE_SECRET_KEY, grpcRagProperties.getServiceSecret());
        metadata.put(USER_ID_KEY, principal.userId());
        return ragStub.withInterceptors(MetadataUtils.newAttachHeadersInterceptor(metadata));
    }

    private GatewayPrincipal resolvePrincipal(String authorization, String correlationHeader) {
        return GatewayPrincipalResolver.resolve(authorization, correlationHeader, jwtValidationService);
    }
}