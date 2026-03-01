package com.aiplatform.gateway.controller;

import com.aiplatform.chat.proto.AddAiModelRequest;
import com.aiplatform.chat.proto.AddMemberRequest;
import com.aiplatform.chat.proto.ChatServiceGrpc;
import com.aiplatform.chat.proto.ChatroomUserRole;
import com.aiplatform.chat.proto.CreateDirectChatRequest;
import com.aiplatform.chat.proto.CreateGroupChatRequest;
import com.aiplatform.chat.proto.GetMyChatroomsRequest;
import com.aiplatform.chat.proto.ListMessagesRequest;
import com.aiplatform.chat.proto.MarkAsReadRequest;
import com.aiplatform.chat.proto.RemoveMemberRequest;
import com.aiplatform.chat.proto.SendMessageRequest;
import com.aiplatform.chat.proto.TypingRequest;
import com.aiplatform.gateway.config.GrpcChatProperties;
import com.aiplatform.gateway.dto.ApiMessageResponse;
import com.aiplatform.gateway.dto.ChatAddAiModelRequest;
import com.aiplatform.gateway.dto.ChatAddMemberRequest;
import com.aiplatform.gateway.dto.ChatCreateDirectRequest;
import com.aiplatform.gateway.dto.ChatCreateGroupRequest;
import com.aiplatform.gateway.dto.ChatMessageResponse;
import com.aiplatform.gateway.dto.ChatSendMessageRequest;
import com.aiplatform.gateway.dto.ChatTypingRequest;
import com.aiplatform.gateway.dto.ChatroomResponse;
import com.aiplatform.gateway.dto.ListChatMessagesResponse;
import com.aiplatform.gateway.dto.ListChatroomsResponse;
import com.aiplatform.gateway.security.JwtValidationService;
import com.aiplatform.gateway.util.GatewayPrincipal;
import com.aiplatform.gateway.util.GatewayPrincipalResolver;
import com.aiplatform.gateway.util.GatewayRequestUtils;
import com.aiplatform.gateway.util.GrpcExceptionMapper;
import com.aiplatform.gateway.util.mapper.ChatResponseMapper;
import io.grpc.Metadata;
import io.grpc.stub.MetadataUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import net.devh.boot.grpc.client.inject.GrpcClient;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
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

    @PostMapping("/direct")
    public Mono<ResponseEntity<ChatroomResponse>> createOrGetDirectChat(
            @Valid @RequestBody ChatCreateDirectRequest request,
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader
    ) {
        return Mono.fromCallable(() -> {
                    GatewayPrincipal principal = resolvePrincipal(authorization, correlationHeader);
                    var response = withMetadata(principal).createOrGetDirectChat(CreateDirectChatRequest.newBuilder()
                            .setOtherUserId(request.otherUserId())
                            .build());
                    return ResponseEntity.ok(ChatResponseMapper.toDto(response));
                })
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorMap(GrpcExceptionMapper::toResponseStatus);
    }

    @PostMapping("/groups")
    public Mono<ResponseEntity<ChatroomResponse>> createGroupChat(
            @Valid @RequestBody ChatCreateGroupRequest request,
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader
    ) {
        return Mono.fromCallable(() -> {
                    GatewayPrincipal principal = resolvePrincipal(authorization, correlationHeader);
                    var response = withMetadata(principal).createGroupChat(CreateGroupChatRequest.newBuilder()
                            .setName(request.name())
                            .setAvatarUrl(GatewayRequestUtils.defaultString(request.avatarUrl()))
                            .addAllMemberUserIds(request.memberUserIds())
                            .build());
                    return ResponseEntity.ok(ChatResponseMapper.toDto(response));
                })
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorMap(GrpcExceptionMapper::toResponseStatus);
    }

    @PostMapping("/{chatroomId}/messages")
    public Mono<ResponseEntity<ChatMessageResponse>> sendMessage(
            @PathVariable String chatroomId,
            @RequestBody ChatSendMessageRequest request,
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader
    ) {
        return Mono.fromCallable(() -> {
                    GatewayPrincipal principal = resolvePrincipal(authorization, correlationHeader);
                    var response = withMetadata(principal).sendMessage(SendMessageRequest.newBuilder()
                            .setChatroomId(chatroomId)
                            .setContent(GatewayRequestUtils.defaultString(request.content()))
                            .setImageUrl(GatewayRequestUtils.defaultString(request.imageUrl()))
                            .setAiModelId(GatewayRequestUtils.defaultString(request.aiModelId()))
                            .build());
                    return ResponseEntity.ok(ChatResponseMapper.toDto(response));
                })
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorMap(GrpcExceptionMapper::toResponseStatus);
    }

    @GetMapping("/{chatroomId}/messages")
    public Mono<ResponseEntity<ListChatMessagesResponse>> listMessages(
            @PathVariable String chatroomId,
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return Mono.fromCallable(() -> {
                    GatewayPrincipal principal = resolvePrincipal(authorization, correlationHeader);
                    var response = withMetadata(principal).listMessages(ListMessagesRequest.newBuilder()
                            .setChatroomId(chatroomId)
                            .setPage(Math.max(page, 0))
                            .setSize(Math.max(size, 1))
                            .build());
                    List<ChatMessageResponse> messages = response.getMessagesList().stream().map(ChatResponseMapper::toDto).toList();
                    return ResponseEntity.ok(new ListChatMessagesResponse(messages, response.getTotal()));
                })
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorMap(GrpcExceptionMapper::toResponseStatus);
    }

    @PostMapping("/{chatroomId}/members")
    public Mono<ResponseEntity<ApiMessageResponse>> addMember(
            @PathVariable String chatroomId,
            @Valid @RequestBody ChatAddMemberRequest request,
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader
    ) {
        return Mono.fromCallable(() -> {
                    GatewayPrincipal principal = resolvePrincipal(authorization, correlationHeader);
                    ChatroomUserRole role = request.role() == null ? ChatroomUserRole.MEMBER : request.role();
                    var response = withMetadata(principal).addMember(AddMemberRequest.newBuilder()
                            .setChatroomId(chatroomId)
                            .setUserId(request.userId())
                            .setRole(role)
                            .build());
                    return ResponseEntity.ok(new ApiMessageResponse(response.getMessage()));
                })
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorMap(GrpcExceptionMapper::toResponseStatus);
    }

    @DeleteMapping("/{chatroomId}/members/{userId}")
    public Mono<ResponseEntity<ApiMessageResponse>> removeMember(
            @PathVariable String chatroomId,
            @PathVariable String userId,
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader
    ) {
        return Mono.fromCallable(() -> {
                    GatewayPrincipal principal = resolvePrincipal(authorization, correlationHeader);
                    var response = withMetadata(principal).removeMember(RemoveMemberRequest.newBuilder()
                            .setChatroomId(chatroomId)
                            .setUserId(userId)
                            .build());
                    return ResponseEntity.ok(new ApiMessageResponse(response.getMessage()));
                })
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorMap(GrpcExceptionMapper::toResponseStatus);
    }

    @PostMapping("/{chatroomId}/read")
    public Mono<ResponseEntity<ApiMessageResponse>> markAsRead(
            @PathVariable String chatroomId,
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader
    ) {
        return Mono.fromCallable(() -> {
                    GatewayPrincipal principal = resolvePrincipal(authorization, correlationHeader);
                    var response = withMetadata(principal).markAsRead(MarkAsReadRequest.newBuilder()
                            .setChatroomId(chatroomId)
                            .build());
                    return ResponseEntity.ok(new ApiMessageResponse(response.getMessage()));
                })
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorMap(GrpcExceptionMapper::toResponseStatus);
    }

    @GetMapping("/my")
    public Mono<ResponseEntity<ListChatroomsResponse>> getMyChatrooms(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return Mono.fromCallable(() -> {
                    GatewayPrincipal principal = resolvePrincipal(authorization, correlationHeader);
                    var response = withMetadata(principal).getMyChatrooms(GetMyChatroomsRequest.newBuilder()
                            .setPage(Math.max(page, 0))
                            .setSize(Math.max(size, 1))
                            .build());
                    List<ChatroomResponse> chatrooms = response.getChatroomsList().stream().map(ChatResponseMapper::toDto).toList();
                    return ResponseEntity.ok(new ListChatroomsResponse(chatrooms, response.getTotal()));
                })
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorMap(GrpcExceptionMapper::toResponseStatus);
    }

    @PostMapping("/{chatroomId}/ai-model")
    public Mono<ResponseEntity<ApiMessageResponse>> addAiModelToChat(
            @PathVariable String chatroomId,
            @Valid @RequestBody ChatAddAiModelRequest request,
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader
    ) {
        return Mono.fromCallable(() -> {
                    GatewayPrincipal principal = resolvePrincipal(authorization, correlationHeader);
                    var response = withMetadata(principal).addAiModelToChat(AddAiModelRequest.newBuilder()
                            .setChatroomId(chatroomId)
                            .setAiModelId(request.aiModelId())
                            .build());
                    return ResponseEntity.ok(new ApiMessageResponse(response.getMessage()));
                })
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorMap(GrpcExceptionMapper::toResponseStatus);
    }

    @PostMapping("/{chatroomId}/typing")
    public Mono<ResponseEntity<ApiMessageResponse>> typingEvent(
            @PathVariable String chatroomId,
            @RequestBody ChatTypingRequest request,
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader
    ) {
        return Mono.fromCallable(() -> {
                    GatewayPrincipal principal = resolvePrincipal(authorization, correlationHeader);
                    var response = withMetadata(principal).typingEvent(TypingRequest.newBuilder()
                            .setChatroomId(chatroomId)
                            .setTyping(request.typing())
                            .build());
                    return ResponseEntity.ok(new ApiMessageResponse(response.getMessage()));
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
}
