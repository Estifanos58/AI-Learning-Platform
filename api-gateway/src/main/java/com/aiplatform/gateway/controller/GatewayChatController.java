package com.aiplatform.gateway.controller;

import com.aiplatform.chat.proto.ChatServiceGrpc;
import com.aiplatform.chat.proto.GetChatroomRequest;
import com.aiplatform.chat.proto.ListChatroomsRequest;
import com.aiplatform.chat.proto.ListMessagesRequest;
import com.aiplatform.chat.proto.SendMessageRequest;
import com.aiplatform.chat.proto.TypingIndicatorRequest;
import com.aiplatform.gateway.config.GrpcChatProperties;
import com.aiplatform.gateway.dto.ApiMessageResponse;
import com.aiplatform.gateway.dto.ChatMessageResponse;
import com.aiplatform.gateway.dto.ChatroomDto;
import com.aiplatform.gateway.dto.ListChatMessagesResponse;
import com.aiplatform.gateway.dto.ListChatroomsResponse;
import com.aiplatform.gateway.dto.SendChatMessageRequest;
import com.aiplatform.gateway.dto.SendChatMessageResponse;
import com.aiplatform.gateway.security.JwtValidationService;
import com.aiplatform.gateway.util.GatewayPrincipal;
import com.aiplatform.gateway.util.GatewayPrincipalResolver;
import com.aiplatform.gateway.util.GrpcExceptionMapper;
import com.google.protobuf.ByteString;
import io.grpc.Metadata;
import io.grpc.stub.MetadataUtils;
import lombok.RequiredArgsConstructor;
import net.devh.boot.grpc.client.inject.GrpcClient;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.util.Base64;
import java.util.List;

@RestController
@RequestMapping("/api/internal/chat")
@RequiredArgsConstructor
public class GatewayChatController {

    private static final Metadata.Key<String> CORRELATION_ID_KEY = Metadata.Key.of("x-correlation-id", Metadata.ASCII_STRING_MARSHALLER);
    private static final Metadata.Key<String> SERVICE_SECRET_KEY = Metadata.Key.of("x-service-secret", Metadata.ASCII_STRING_MARSHALLER);
    private static final Metadata.Key<String> USER_ID_KEY = Metadata.Key.of("x-user-id", Metadata.ASCII_STRING_MARSHALLER);
    private static final Metadata.Key<String> USER_ROLES_KEY = Metadata.Key.of("x-roles", Metadata.ASCII_STRING_MARSHALLER);
    private static final Metadata.Key<String> UNIVERSITY_ID_KEY = Metadata.Key.of("x-university-id", Metadata.ASCII_STRING_MARSHALLER);

    @GrpcClient("chat-service")
    private ChatServiceGrpc.ChatServiceBlockingStub chatStub;

    private final GrpcChatProperties grpcChatProperties;
    private final JwtValidationService jwtValidationService;

    @PostMapping("/messages")
    public Mono<ResponseEntity<SendChatMessageResponse>> sendMessage(
            @RequestBody SendChatMessageRequest request,
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader
    ) {
        return Mono.fromCallable(() -> {
                    GatewayPrincipal principal = resolvePrincipal(authorization, correlationHeader);

                    SendMessageRequest.Builder grpcRequest = SendMessageRequest.newBuilder()
                            .setUserId(principal.userId());

                    if (request.otherUserId() != null) grpcRequest.setOtherUserId(request.otherUserId());
                    if (request.chatroomId() != null) grpcRequest.setChatroomId(request.chatroomId());
                    if (request.aiModelId() != null) grpcRequest.setAiModelId(request.aiModelId());
                    if (request.content() != null) grpcRequest.setContent(request.content());
                    if (request.fileId() != null) grpcRequest.setFileId(request.fileId());
                    if (request.fileOriginalName() != null) grpcRequest.setFileOriginalName(request.fileOriginalName());
                    if (request.fileContentType() != null) grpcRequest.setFileContentType(request.fileContentType());
                    if (request.fileBase64() != null && !request.fileBase64().isBlank()) {
                        grpcRequest.setFileContent(ByteString.copyFrom(Base64.getDecoder().decode(request.fileBase64())));
                    }

                    var response = withMetadata(principal).sendMessage(grpcRequest.build());
                    return ResponseEntity.ok(new SendChatMessageResponse(
                            toMessageDto(response.getMessage()),
                            response.getChatroomId(),
                            response.getIsNewChatroom()
                    ));
                })
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorMap(GrpcExceptionMapper::toResponseStatus);
    }

    @GetMapping("/chatrooms/{chatroomId}")
    public Mono<ResponseEntity<ChatroomDto>> getChatroom(
            @PathVariable String chatroomId,
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader
    ) {
        return Mono.fromCallable(() -> {
                    GatewayPrincipal principal = resolvePrincipal(authorization, correlationHeader);
                    var response = withMetadata(principal)
                            .getChatroom(GetChatroomRequest.newBuilder().setChatroomId(chatroomId).build());
                    return ResponseEntity.ok(toChatroomDto(response));
                })
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorMap(GrpcExceptionMapper::toResponseStatus);
    }

    @GetMapping("/chatrooms")
    public Mono<ResponseEntity<ListChatroomsResponse>> listChatrooms(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return Mono.fromCallable(() -> {
                    GatewayPrincipal principal = resolvePrincipal(authorization, correlationHeader);
                    var response = withMetadata(principal)
                            .listChatrooms(ListChatroomsRequest.newBuilder()
                                    .setUserId(principal.userId())
                                    .setPage(Math.max(page, 0))
                                    .setSize(Math.max(size, 1))
                                    .build());
                    List<ChatroomDto> chatrooms = response.getChatroomsList().stream().map(this::toChatroomDto).toList();
                    return ResponseEntity.ok(new ListChatroomsResponse(chatrooms, response.getTotal()));
                })
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorMap(GrpcExceptionMapper::toResponseStatus);
    }

    @GetMapping("/chatrooms/{chatroomId}/messages")
    public Mono<ResponseEntity<ListChatMessagesResponse>> listMessages(
            @PathVariable String chatroomId,
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return Mono.fromCallable(() -> {
                    GatewayPrincipal principal = resolvePrincipal(authorization, correlationHeader);
                    var response = withMetadata(principal)
                            .listMessages(ListMessagesRequest.newBuilder()
                                    .setChatroomId(chatroomId)
                                    .setUserId(principal.userId())
                                    .setPage(Math.max(page, 0))
                                    .setSize(Math.max(size, 1))
                                    .build());
                    List<ChatMessageResponse> messages = response.getMessagesList().stream().map(this::toMessageDto).toList();
                    return ResponseEntity.ok(new ListChatMessagesResponse(messages, response.getTotal()));
                })
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorMap(GrpcExceptionMapper::toResponseStatus);
    }

    @PostMapping("/chatrooms/{chatroomId}/typing")
    public Mono<ResponseEntity<ApiMessageResponse>> sendTypingIndicator(
            @PathVariable String chatroomId,
            @RequestParam(defaultValue = "true") boolean isTyping,
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader
    ) {
        return Mono.fromCallable(() -> {
                    GatewayPrincipal principal = resolvePrincipal(authorization, correlationHeader);
                    withMetadata(principal).sendTypingIndicator(TypingIndicatorRequest.newBuilder()
                            .setUserId(principal.userId())
                            .setChatroomId(chatroomId)
                            .setIsTyping(isTyping)
                            .build());
                    return ResponseEntity.ok(new ApiMessageResponse("OK"));
                })
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorMap(GrpcExceptionMapper::toResponseStatus);
    }

    private ChatServiceGrpc.ChatServiceBlockingStub withMetadata(GatewayPrincipal principal) {
        Metadata metadata = new Metadata();
        metadata.put(CORRELATION_ID_KEY, principal.correlationId());
        metadata.put(SERVICE_SECRET_KEY, grpcChatProperties.getServiceSecret());
        metadata.put(USER_ID_KEY, principal.userId());
        if (!principal.roles().isBlank()) {
            metadata.put(USER_ROLES_KEY, principal.roles());
        }
        if (!principal.universityId().isBlank()) {
            metadata.put(UNIVERSITY_ID_KEY, principal.universityId());
        }
        return chatStub.withInterceptors(MetadataUtils.newAttachHeadersInterceptor(metadata));
    }

    private GatewayPrincipal resolvePrincipal(String authorization, String correlationHeader) {
        return GatewayPrincipalResolver.resolve(authorization, correlationHeader, jwtValidationService);
    }

    private ChatMessageResponse toMessageDto(com.aiplatform.chat.proto.MessageDto msg) {
        return new ChatMessageResponse(
                msg.getId(), msg.getChatroomId(), msg.getSenderUserId(),
                msg.getAiModelId(), msg.getContent(), msg.getFileId(), msg.getCreatedAt()
        );
    }

    private ChatroomDto toChatroomDto(com.aiplatform.chat.proto.ChatroomResponse cr) {
        return new ChatroomDto(cr.getId(), cr.getType(), cr.getMemberIdsList(), cr.getCreatedAt());
    }
}
