package com.aiplatform.gateway.controller;

import com.aiplatform.ai.proto.AiModelDto;
import com.aiplatform.ai.proto.AiModelServiceGrpc;
import com.aiplatform.ai.proto.ApiKeyResponse;
import com.aiplatform.ai.proto.CreateUserApiKeyRequest;
import com.aiplatform.ai.proto.DeleteUserApiKeyRequest;
import com.aiplatform.ai.proto.ListModelsRequest;
import com.aiplatform.ai.proto.UpdateUserApiKeyRequest;
import com.aiplatform.gateway.config.GrpcRagProperties;
import com.aiplatform.gateway.dto.AiApiKeyResponse;
import com.aiplatform.gateway.dto.AiApiKeyUpsertRequest;
import com.aiplatform.gateway.dto.AiModelResponse;
import com.aiplatform.gateway.security.JwtValidationService;
import com.aiplatform.gateway.util.GatewayPrincipal;
import com.aiplatform.gateway.util.GatewayPrincipalResolver;
import com.aiplatform.gateway.util.GrpcExceptionMapper;
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
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.util.List;

@RestController
@RequestMapping("/api/internal/ai")
public class AiModelController {

    private static final Metadata.Key<String> CORRELATION_ID_KEY = Metadata.Key.of("x-correlation-id", Metadata.ASCII_STRING_MARSHALLER);
    private static final Metadata.Key<String> SERVICE_SECRET_KEY = Metadata.Key.of("x-service-secret", Metadata.ASCII_STRING_MARSHALLER);
    private static final Metadata.Key<String> USER_ID_KEY = Metadata.Key.of("x-user-id", Metadata.ASCII_STRING_MARSHALLER);

    @GrpcClient("rag-service")
    private AiModelServiceGrpc.AiModelServiceBlockingStub aiModelStub;

    private final GrpcRagProperties grpcRagProperties;
    private final JwtValidationService jwtValidationService;

    public AiModelController(GrpcRagProperties grpcRagProperties, JwtValidationService jwtValidationService) {
        this.grpcRagProperties = grpcRagProperties;
        this.jwtValidationService = jwtValidationService;
    }

    @GetMapping("/models")
    public Mono<ResponseEntity<List<AiModelResponse>>> listModels(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader
    ) {
        return Mono.fromCallable(() -> {
                    GatewayPrincipal principal = resolvePrincipal(authorization, correlationHeader);
                    var response = withMetadata(principal).listModels(ListModelsRequest.newBuilder().build());
                    List<AiModelResponse> models = response.getModelsList().stream().map(this::toDto).toList();
                    return ResponseEntity.ok(models);
                })
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorMap(GrpcExceptionMapper::toResponseStatus);
    }

            @PostMapping("/api-keys")
            public Mono<ResponseEntity<AiApiKeyResponse>> createApiKey(
                @Valid @RequestBody AiApiKeyUpsertRequest request,
                @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
                @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader
            ) {
            return Mono.fromCallable(() -> {
                    GatewayPrincipal principal = resolvePrincipal(authorization, correlationHeader);
                    ApiKeyResponse response = withMetadata(principal).createUserApiKey(
                        CreateUserApiKeyRequest.newBuilder()
                            .setModelId(request.modelId())
                            .setApiKey(request.apiKey())
                            .build()
                    );
                    return ResponseEntity.status(HttpStatus.CREATED).body(toApiKeyDto(response));
                })
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorMap(GrpcExceptionMapper::toResponseStatus);
            }

            @PutMapping("/api-keys/{modelId}")
            public Mono<ResponseEntity<AiApiKeyResponse>> updateApiKey(
                @PathVariable String modelId,
                @Valid @RequestBody AiApiKeyUpsertRequest request,
                @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
                @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader
            ) {
            if (!modelId.equals(request.modelId())) {
                return Mono.error(new ResponseStatusException(HttpStatus.BAD_REQUEST, "modelId in path and body must match"));
            }

            return Mono.fromCallable(() -> {
                    GatewayPrincipal principal = resolvePrincipal(authorization, correlationHeader);
                    ApiKeyResponse response = withMetadata(principal).updateUserApiKey(
                        UpdateUserApiKeyRequest.newBuilder()
                            .setModelId(modelId)
                            .setApiKey(request.apiKey())
                            .build()
                    );
                    return ResponseEntity.ok(toApiKeyDto(response));
                })
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorMap(GrpcExceptionMapper::toResponseStatus);
            }

            @DeleteMapping("/api-keys/{modelId}")
            public Mono<ResponseEntity<AiApiKeyResponse>> deleteApiKey(
                @PathVariable String modelId,
                @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
                @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader
            ) {
            return Mono.fromCallable(() -> {
                    GatewayPrincipal principal = resolvePrincipal(authorization, correlationHeader);
                    ApiKeyResponse response = withMetadata(principal).deleteUserApiKey(
                        DeleteUserApiKeyRequest.newBuilder()
                            .setModelId(modelId)
                            .build()
                    );
                    return ResponseEntity.ok(toApiKeyDto(response));
                })
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorMap(GrpcExceptionMapper::toResponseStatus);
            }

    private AiModelServiceGrpc.AiModelServiceBlockingStub withMetadata(GatewayPrincipal principal) {
        Metadata metadata = new Metadata();
        metadata.put(CORRELATION_ID_KEY, principal.correlationId());
        metadata.put(SERVICE_SECRET_KEY, grpcRagProperties.getServiceSecret());
        metadata.put(USER_ID_KEY, principal.userId());
        return aiModelStub.withInterceptors(MetadataUtils.newAttachHeadersInterceptor(metadata));
    }

    private GatewayPrincipal resolvePrincipal(String authorization, String correlationHeader) {
        return GatewayPrincipalResolver.resolve(authorization, correlationHeader, jwtValidationService);
    }

    private AiModelResponse toDto(AiModelDto model) {
        return new AiModelResponse(
                model.getModelId(),
                model.getModelName(),
                model.getProvider(),
                model.getContextLength(),
                model.getSupportsStreaming(),
                model.getUserKeyConfigured(),
                model.getPlatformKeyAvailable(),
                model.getDescription()
        );
    }

    private AiApiKeyResponse toApiKeyDto(ApiKeyResponse response) {
        return new AiApiKeyResponse(response.getModelId(), response.getStatus());
    }
}
