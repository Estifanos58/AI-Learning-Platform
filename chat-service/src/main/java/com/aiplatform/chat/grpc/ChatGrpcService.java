package com.aiplatform.chat.grpc;

import com.aiplatform.chat.domain.ChatroomRole;
import com.aiplatform.chat.grpc.util.ChatGrpcExceptionMapper;
import com.aiplatform.chat.grpc.util.ChatGrpcPrincipalResolver;
import com.aiplatform.chat.grpc.util.ChatGrpcResponseMapper;
import com.aiplatform.chat.proto.AddAiModelRequest;
import com.aiplatform.chat.proto.AddMemberRequest;
import com.aiplatform.chat.proto.ChatServiceGrpc;
import com.aiplatform.chat.proto.ChatroomUserRole;
import com.aiplatform.chat.proto.CreateDirectChatRequest;
import com.aiplatform.chat.proto.CreateGroupChatRequest;
import com.aiplatform.chat.proto.GetMyChatroomsRequest;
import com.aiplatform.chat.proto.ListChatroomsResponse;
import com.aiplatform.chat.proto.ListMessagesRequest;
import com.aiplatform.chat.proto.ListMessagesResponse;
import com.aiplatform.chat.proto.MarkAsReadRequest;
import com.aiplatform.chat.proto.RemoveMemberRequest;
import com.aiplatform.chat.proto.SendMessageRequest;
import com.aiplatform.chat.proto.SimpleResponse;
import com.aiplatform.chat.proto.TypingRequest;
import com.aiplatform.chat.service.AuthenticatedPrincipal;
import com.aiplatform.chat.service.ChatApplicationService;
import io.grpc.stub.StreamObserver;
import lombok.RequiredArgsConstructor;
import net.devh.boot.grpc.server.service.GrpcService;

import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@GrpcService
@RequiredArgsConstructor
public class ChatGrpcService extends ChatServiceGrpc.ChatServiceImplBase {

    private final ChatApplicationService chatApplicationService;

    @Override
    public void createOrGetDirectChat(CreateDirectChatRequest request, StreamObserver<com.aiplatform.chat.proto.ChatroomResponse> responseObserver) {
        try {
            AuthenticatedPrincipal principal = ChatGrpcPrincipalResolver.requirePrincipal();
            var chatroom = chatApplicationService.createOrGetDirectChat(UUID.fromString(request.getOtherUserId()), principal);
            responseObserver.onNext(ChatGrpcResponseMapper.toResponse(chatroom));
            responseObserver.onCompleted();
        } catch (Exception exception) {
            responseObserver.onError(ChatGrpcExceptionMapper.toStatusException(exception));
        }
    }

    @Override
    public void createGroupChat(CreateGroupChatRequest request, StreamObserver<com.aiplatform.chat.proto.ChatroomResponse> responseObserver) {
        try {
            AuthenticatedPrincipal principal = ChatGrpcPrincipalResolver.requirePrincipal();
            Set<UUID> memberIds = request.getMemberUserIdsList().stream().map(UUID::fromString).collect(Collectors.toSet());
            var chatroom = chatApplicationService.createGroupChat(request.getName(), request.getAvatarUrl(), memberIds, principal);
            responseObserver.onNext(ChatGrpcResponseMapper.toResponse(chatroom));
            responseObserver.onCompleted();
        } catch (Exception exception) {
            responseObserver.onError(ChatGrpcExceptionMapper.toStatusException(exception));
        }
    }

    @Override
    public void sendMessage(SendMessageRequest request, StreamObserver<com.aiplatform.chat.proto.MessageResponse> responseObserver) {
        try {
            AuthenticatedPrincipal principal = ChatGrpcPrincipalResolver.requirePrincipal();
            UUID aiModelId = request.getAiModelId().isBlank() ? null : UUID.fromString(request.getAiModelId());
            var message = chatApplicationService.sendMessage(
                    UUID.fromString(request.getChatroomId()),
                    request.getContent(),
                    request.getImageUrl(),
                    aiModelId,
                    principal
            );
            responseObserver.onNext(ChatGrpcResponseMapper.toResponse(message));
            responseObserver.onCompleted();
        } catch (Exception exception) {
            responseObserver.onError(ChatGrpcExceptionMapper.toStatusException(exception));
        }
    }

    @Override
    public void listMessages(ListMessagesRequest request, StreamObserver<ListMessagesResponse> responseObserver) {
        try {
            AuthenticatedPrincipal principal = ChatGrpcPrincipalResolver.requirePrincipal();
            var page = chatApplicationService.listMessages(
                    UUID.fromString(request.getChatroomId()),
                    request.getPage(),
                    request.getSize() == 0 ? 20 : request.getSize(),
                    principal
            );

            ListMessagesResponse.Builder builder = ListMessagesResponse.newBuilder().setTotal(page.getTotalElements());
            page.getContent().forEach(message -> builder.addMessages(ChatGrpcResponseMapper.toResponse(message)));
            responseObserver.onNext(builder.build());
            responseObserver.onCompleted();
        } catch (Exception exception) {
            responseObserver.onError(ChatGrpcExceptionMapper.toStatusException(exception));
        }
    }

    @Override
    public void addMember(AddMemberRequest request, StreamObserver<SimpleResponse> responseObserver) {
        try {
            AuthenticatedPrincipal principal = ChatGrpcPrincipalResolver.requirePrincipal();
            ChatroomRole role = mapRole(request.getRole());
            chatApplicationService.addMember(
                    UUID.fromString(request.getChatroomId()),
                    UUID.fromString(request.getUserId()),
                    role,
                    principal
            );
            responseObserver.onNext(SimpleResponse.newBuilder().setMessage("Member added").build());
            responseObserver.onCompleted();
        } catch (Exception exception) {
            responseObserver.onError(ChatGrpcExceptionMapper.toStatusException(exception));
        }
    }

    @Override
    public void removeMember(RemoveMemberRequest request, StreamObserver<SimpleResponse> responseObserver) {
        try {
            AuthenticatedPrincipal principal = ChatGrpcPrincipalResolver.requirePrincipal();
            chatApplicationService.removeMember(
                    UUID.fromString(request.getChatroomId()),
                    UUID.fromString(request.getUserId()),
                    principal
            );
            responseObserver.onNext(SimpleResponse.newBuilder().setMessage("Member removed").build());
            responseObserver.onCompleted();
        } catch (Exception exception) {
            responseObserver.onError(ChatGrpcExceptionMapper.toStatusException(exception));
        }
    }

    @Override
    public void markAsRead(MarkAsReadRequest request, StreamObserver<SimpleResponse> responseObserver) {
        try {
            AuthenticatedPrincipal principal = ChatGrpcPrincipalResolver.requirePrincipal();
            chatApplicationService.markAsRead(UUID.fromString(request.getChatroomId()), principal);
            responseObserver.onNext(SimpleResponse.newBuilder().setMessage("Marked as read").build());
            responseObserver.onCompleted();
        } catch (Exception exception) {
            responseObserver.onError(ChatGrpcExceptionMapper.toStatusException(exception));
        }
    }

    @Override
    public void getMyChatrooms(GetMyChatroomsRequest request, StreamObserver<ListChatroomsResponse> responseObserver) {
        try {
            AuthenticatedPrincipal principal = ChatGrpcPrincipalResolver.requirePrincipal();
            var page = chatApplicationService.getMyChatrooms(
                    request.getPage(),
                    request.getSize() == 0 ? 20 : request.getSize(),
                    principal
            );
            ListChatroomsResponse.Builder builder = ListChatroomsResponse.newBuilder().setTotal(page.getTotalElements());
            page.getContent().forEach(chatroom -> builder.addChatrooms(ChatGrpcResponseMapper.toResponse(chatroom)));
            responseObserver.onNext(builder.build());
            responseObserver.onCompleted();
        } catch (Exception exception) {
            responseObserver.onError(ChatGrpcExceptionMapper.toStatusException(exception));
        }
    }

    @Override
    public void addAiModelToChat(AddAiModelRequest request, StreamObserver<SimpleResponse> responseObserver) {
        try {
            AuthenticatedPrincipal principal = ChatGrpcPrincipalResolver.requirePrincipal();
            chatApplicationService.addAiModelToChat(
                    UUID.fromString(request.getChatroomId()),
                    UUID.fromString(request.getAiModelId()),
                    principal
            );
            responseObserver.onNext(SimpleResponse.newBuilder().setMessage("AI model added").build());
            responseObserver.onCompleted();
        } catch (Exception exception) {
            responseObserver.onError(ChatGrpcExceptionMapper.toStatusException(exception));
        }
    }

    @Override
    public void typingEvent(TypingRequest request, StreamObserver<SimpleResponse> responseObserver) {
        try {
            AuthenticatedPrincipal principal = ChatGrpcPrincipalResolver.requirePrincipal();
            chatApplicationService.typingEvent(UUID.fromString(request.getChatroomId()), request.getTyping(), principal);
            responseObserver.onNext(SimpleResponse.newBuilder().setMessage("Typing event published").build());
            responseObserver.onCompleted();
        } catch (Exception exception) {
            responseObserver.onError(ChatGrpcExceptionMapper.toStatusException(exception));
        }
    }

    private ChatroomRole mapRole(ChatroomUserRole role) {
        return switch (role) {
            case ADMIN -> ChatroomRole.ADMIN;
            case AI_MODEL -> ChatroomRole.AI_MODEL;
            case MEMBER, UNRECOGNIZED -> ChatroomRole.MEMBER;
        };
    }
}
