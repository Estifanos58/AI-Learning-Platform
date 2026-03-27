package com.aiplatform.gateway.controller;

import com.aiplatform.ai.proto.AiModelDto;
import com.aiplatform.ai.proto.AiModelServiceGrpc;
import com.aiplatform.ai.proto.AttachProviderToModelRequest;
import com.aiplatform.ai.proto.CreateModelDefinitionRequest;
import com.aiplatform.ai.proto.CreateProviderAccountRequest;
import com.aiplatform.ai.proto.ListAccountsRequest;
import com.aiplatform.ai.proto.ListModelsRequest;
import com.aiplatform.ai.proto.ListProvidersRequest;
import com.aiplatform.ai.proto.ModelProviderDto;
import com.aiplatform.ai.proto.ProviderAccountDto;
import com.aiplatform.gateway.config.GrpcRagProperties;
import com.aiplatform.gateway.dto.AiModelCreateRequest;
import com.aiplatform.gateway.dto.AiModelResponse;
import com.aiplatform.gateway.dto.AiProviderAccountCreateRequest;
import com.aiplatform.gateway.dto.AiProviderAccountResponse;
import com.aiplatform.gateway.dto.AiProviderAttachRequest;
import com.aiplatform.gateway.dto.AiProviderResponse;
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
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
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

    @PostMapping("/models")
    public Mono<ResponseEntity<AiModelResponse>> createModel(
            @Valid @RequestBody AiModelCreateRequest request,
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader
    ) {
        return Mono.fromCallable(() -> {
                    GatewayPrincipal principal = resolvePrincipal(authorization, correlationHeader);
                    var response = withMetadata(principal).createModelDefinition(
                            CreateModelDefinitionRequest.newBuilder()
                                    .setModelName(request.modelName())
                                    .setFamily(request.family())
                                    .setContextLength(request.contextLength())
                                    .setCapabilitiesJson(request.capabilitiesJson() == null ? "{}" : request.capabilitiesJson())
                                    .setActive(request.active())
                                    .build()
                    );
                    return ResponseEntity.status(HttpStatus.CREATED).body(toDto(response.getModel()));
                })
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorMap(GrpcExceptionMapper::toResponseStatus);
    }

    @PostMapping("/providers")
    public Mono<ResponseEntity<AiProviderResponse>> attachProvider(
            @Valid @RequestBody AiProviderAttachRequest request,
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader
    ) {
        return Mono.fromCallable(() -> {
                    GatewayPrincipal principal = resolvePrincipal(authorization, correlationHeader);
                    var response = withMetadata(principal).attachProviderToModel(
                            AttachProviderToModelRequest.newBuilder()
                                    .setModelId(request.modelId())
                                    .setProviderName(request.providerName())
                                    .setProviderModelName(request.providerModelName())
                                    .setPriority(request.priority())
                                    .setActive(request.active())
                                    .build()
                    );
                    return ResponseEntity.status(HttpStatus.CREATED).body(toProviderDto(response.getProvider()));
                })
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorMap(GrpcExceptionMapper::toResponseStatus);
    }

    @PostMapping("/accounts")
    public Mono<ResponseEntity<AiProviderAccountResponse>> createProviderAccount(
            @Valid @RequestBody AiProviderAccountCreateRequest request,
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader
    ) {
        return Mono.fromCallable(() -> {
                    GatewayPrincipal principal = resolvePrincipal(authorization, correlationHeader);
                    var response = withMetadata(principal).createProviderAccount(
                            CreateProviderAccountRequest.newBuilder()
                                    .setProviderName(request.providerName())
                                    .setAccountLabel(request.accountLabel())
                                    .setApiKey(request.apiKey())
                                    .setRateLimitPerMinute(request.rateLimitPerMinute())
                                    .setDailyQuota(request.dailyQuota())
                                    .setIsActive(request.active())
                                    .build()
                    );
                    return ResponseEntity.status(HttpStatus.CREATED).body(toAccountDto(response.getAccount()));
                })
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorMap(GrpcExceptionMapper::toResponseStatus);
    }

    @GetMapping("/providers")
    public Mono<ResponseEntity<List<AiProviderResponse>>> listProviders(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader,
            @RequestParam(required = false) String modelId
    ) {
        return Mono.fromCallable(() -> {
                    GatewayPrincipal principal = resolvePrincipal(authorization, correlationHeader);
                    var request = ListProvidersRequest.newBuilder();
                    if (modelId != null && !modelId.isBlank()) {
                        request.setModelId(modelId);
                    }
                    var response = withMetadata(principal).listProviders(request.build());
                    List<AiProviderResponse> providers = response.getProvidersList().stream().map(this::toProviderDto).toList();
                    return ResponseEntity.ok(providers);
                })
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorMap(GrpcExceptionMapper::toResponseStatus);
    }

    @GetMapping("/accounts")
    public Mono<ResponseEntity<List<AiProviderAccountResponse>>> listAccounts(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader,
            @RequestParam(required = false) String providerName
    ) {
        return Mono.fromCallable(() -> {
                    GatewayPrincipal principal = resolvePrincipal(authorization, correlationHeader);
                    var request = ListAccountsRequest.newBuilder();
                    if (providerName != null && !providerName.isBlank()) {
                        request.setProviderName(providerName);
                    }
                    var response = withMetadata(principal).listAccounts(request.build());
                    List<AiProviderAccountResponse> accounts = response.getAccountsList().stream().map(this::toAccountDto).toList();
                    return ResponseEntity.ok(accounts);
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
                model.getFamily(),
                model.getContextLength(),
                model.getCapabilitiesJson(),
                model.getActive(),
                model.getProviderCount()
        );
    }

    private AiProviderResponse toProviderDto(ModelProviderDto provider) {
        return new AiProviderResponse(
                provider.getProviderId(),
                provider.getModelId(),
                provider.getProviderName(),
                provider.getProviderModelName(),
                provider.getPriority(),
                provider.getActive()
        );
    }

    private AiProviderAccountResponse toAccountDto(ProviderAccountDto account) {
        return new AiProviderAccountResponse(
                account.getAccountId(),
                account.getProviderName(),
                account.getAccountLabel(),
                account.getRateLimitPerMinute(),
                account.getDailyQuota(),
                account.getUsedToday(),
                account.getLastUsedAt(),
                account.getLastResetAt(),
                account.getIsActive(),
                account.getHealthStatus()
        );
    }
}
