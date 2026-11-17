package com.aiplatform.gateway.controller;

import com.aiplatform.gateway.config.GrpcRagProperties;
import com.aiplatform.gateway.dto.ApiMessageResponse;
import com.aiplatform.gateway.dto.DirectChatMessageResponse;
import com.aiplatform.gateway.dto.DirectChatroomDetailResponse;
import com.aiplatform.gateway.dto.DirectChatroomResponse;
import com.aiplatform.gateway.dto.ListDirectChatMessagesResponse;
import com.aiplatform.gateway.dto.ListDirectChatroomsResponse;
import com.aiplatform.gateway.dto.UpdateChatroomTitleRequest;
import com.aiplatform.gateway.security.JwtValidationService;
import com.aiplatform.gateway.util.GatewayPrincipal;
import com.aiplatform.gateway.util.GatewayPrincipalResolver;
import com.aiplatform.gateway.util.GrpcExceptionMapper;
import com.aiplatform.rag.proto.DeleteChatroomRequest;
import com.aiplatform.rag.proto.GetChatroomRequest;
import com.aiplatform.rag.proto.ListChatroomMessagesRequest;
import com.aiplatform.rag.proto.ListChatroomsRequest;
import com.aiplatform.rag.proto.MessageDto;
import com.aiplatform.rag.proto.RagServiceGrpc;
import io.grpc.Metadata;
import io.grpc.stub.MetadataUtils;
import jakarta.validation.Valid;
import net.devh.boot.grpc.client.inject.GrpcClient;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.util.List;

@RestController
@RequestMapping("/api/internal/chatrooms")
public class GatewayDirectChatroomController {

    private static final Metadata.Key<String> CORRELATION_ID_KEY = Metadata.Key.of("x-correlation-id", Metadata.ASCII_STRING_MARSHALLER);
    private static final Metadata.Key<String> SERVICE_SECRET_KEY = Metadata.Key.of("x-service-secret", Metadata.ASCII_STRING_MARSHALLER);
    private static final Metadata.Key<String> USER_ID_KEY = Metadata.Key.of("x-user-id", Metadata.ASCII_STRING_MARSHALLER);

    @GrpcClient("rag-service")
    private RagServiceGrpc.RagServiceBlockingStub ragStub;

    private final GrpcRagProperties grpcRagProperties;
    private final JwtValidationService jwtValidationService;

    public GatewayDirectChatroomController(
            GrpcRagProperties grpcRagProperties,
            JwtValidationService jwtValidationService
    ) {
        this.grpcRagProperties = grpcRagProperties;
        this.jwtValidationService = jwtValidationService;
    }

    @GetMapping
    public Mono<ResponseEntity<ListDirectChatroomsResponse>> listChatrooms(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return Mono.fromCallable(() -> {
                    GatewayPrincipal principal = resolvePrincipal(authorization, correlationHeader);
                    var response = withMetadata(principal)
                            .listChatrooms(ListChatroomsRequest.newBuilder()
                                    .setPage(Math.max(0, page))
                                    .setSize(Math.max(1, size))
                                    .build());
                    List<DirectChatroomResponse> rooms = response.getChatroomsList().stream()
                            .map(room -> new DirectChatroomResponse(
                                    room.getId(),
                                    room.getTitle(),
                                    room.getCreatedAt(),
                                    room.getUpdatedAt()
                            ))
                            .toList();
                    return ResponseEntity.ok(new ListDirectChatroomsResponse(rooms, response.getTotal()));
                })
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorMap(GrpcExceptionMapper::toResponseStatus);
    }

    @GetMapping("/{chatroomId}/messages")
    public Mono<ResponseEntity<ListDirectChatMessagesResponse>> listMessages(
            @PathVariable String chatroomId,
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size
    ) {
        return Mono.fromCallable(() -> {
                    GatewayPrincipal principal = resolvePrincipal(authorization, correlationHeader);
                    var response = withMetadata(principal)
                            .listChatroomMessages(ListChatroomMessagesRequest.newBuilder()
                                    .setChatroomId(chatroomId)
                                    .setPage(Math.max(0, page))
                                    .setSize(Math.max(1, size))
                                    .build());
                    List<DirectChatMessageResponse> messages = response.getMessagesList().stream()
                            .map(this::toMessage)
                            .toList();
                    return ResponseEntity.ok(new ListDirectChatMessagesResponse(messages, response.getTotal()));
                })
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorMap(GrpcExceptionMapper::toResponseStatus);
    }

    @GetMapping("/{chatroomId}")
    public Mono<ResponseEntity<DirectChatroomDetailResponse>> getChatroom(
            @PathVariable String chatroomId,
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader
    ) {
        return Mono.fromCallable(() -> {
                    GatewayPrincipal principal = resolvePrincipal(authorization, correlationHeader);
                    var response = withMetadata(principal)
                            .getChatroom(GetChatroomRequest.newBuilder().setChatroomId(chatroomId).build());
                    List<DirectChatMessageResponse> messages = response.getMessagesList().stream()
                            .map(this::toMessage)
                            .toList();
                    return ResponseEntity.ok(new DirectChatroomDetailResponse(
                            response.getChatroom().getId(),
                            response.getChatroom().getTitle(),
                            response.getChatroom().getCreatedAt(),
                            response.getChatroom().getUpdatedAt(),
                            messages
                    ));
                })
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorMap(GrpcExceptionMapper::toResponseStatus);
    }

    @PatchMapping("/{chatroomId}")
    public Mono<ResponseEntity<DirectChatroomResponse>> updateChatroom(
            @PathVariable String chatroomId,
            @Valid @RequestBody UpdateChatroomTitleRequest request,
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader
    ) {
        return Mono.fromCallable(() -> {
                    GatewayPrincipal principal = resolvePrincipal(authorization, correlationHeader);
                    var response = withMetadata(principal).updateChatroomTitle(
                            com.aiplatform.rag.proto.UpdateChatroomTitleRequest.newBuilder()
                                    .setChatroomId(chatroomId)
                                    .setTitle(request.title())
                                    .build()
                    );
                    return ResponseEntity.ok(new DirectChatroomResponse(
                            response.getId(),
                            response.getTitle(),
                            response.getCreatedAt(),
                            response.getUpdatedAt()
                    ));
                })
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorMap(GrpcExceptionMapper::toResponseStatus);
    }

    @DeleteMapping("/{chatroomId}")
    public Mono<ResponseEntity<ApiMessageResponse>> deleteChatroom(
            @PathVariable String chatroomId,
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader
    ) {
        return Mono.fromCallable(() -> {
                    GatewayPrincipal principal = resolvePrincipal(authorization, correlationHeader);
                    var response = withMetadata(principal)
                            .deleteChatroom(DeleteChatroomRequest.newBuilder().setChatroomId(chatroomId).build());
                    return ResponseEntity.ok(new ApiMessageResponse(response.getStatus()));
                })
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorMap(GrpcExceptionMapper::toResponseStatus);
    }

    private DirectChatMessageResponse toMessage(MessageDto message) {
        return new DirectChatMessageResponse(
                message.getId(),
                message.getChatroomId(),
                message.getRole(),
                message.getContent(),
                message.getStatus(),
                message.getCreatedAt(),
                message.getUpdatedAt()
        );
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
