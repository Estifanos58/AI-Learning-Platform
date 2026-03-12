package com.aiplatform.chat.grpc;

import com.aiplatform.chat.domain.ChatroomMemberEntity;
import com.aiplatform.chat.domain.MessageEntity;
import com.aiplatform.chat.exception.InvalidChatOperationException;
import com.aiplatform.chat.proto.ChatroomResponse;
import com.aiplatform.chat.proto.ChatServiceGrpc;
import com.aiplatform.chat.proto.GetChatroomRequest;
import com.aiplatform.chat.proto.ListChatroomsRequest;
import com.aiplatform.chat.proto.ListChatroomsResponse;
import com.aiplatform.chat.proto.ListMessagesRequest;
import com.aiplatform.chat.proto.ListMessagesResponse;
import com.aiplatform.chat.proto.MessageDto;
import com.aiplatform.chat.proto.SendMessageRequest;
import com.aiplatform.chat.proto.SendMessageResponse;
import com.aiplatform.chat.proto.SimpleResponse;
import com.aiplatform.chat.proto.TypingIndicatorRequest;
import com.aiplatform.chat.proto.CancelMessageRequest;
import com.aiplatform.chat.proto.MessageChunk;
import com.aiplatform.chat.proto.StreamMessageRequest;
import com.aiplatform.chat.service.ChatKafkaPublisher;
import io.grpc.stub.StreamObserver;
import lombok.RequiredArgsConstructor;
import net.devh.boot.grpc.server.service.GrpcService;

import java.util.List;
import java.util.UUID;

@GrpcService
@RequiredArgsConstructor
public class ChatGrpcService extends ChatServiceGrpc.ChatServiceImplBase {

    private final ChatApplicationService chatApplicationService;
    private final ChatKafkaPublisher kafkaPublisher;

    @Override
    public void sendMessage(SendMessageRequest request, StreamObserver<SendMessageResponse> responseObserver) {
        try {
            UUID userId = parseUuid(request.getUserId(), "userId");
            UUID otherUserId = parseOptionalUuid(request.getOtherUserId());
            UUID chatroomId = parseOptionalUuid(request.getChatroomId());
            UUID fileId = parseOptionalUuid(request.getFileId());
            String correlationId = GrpcContextKeys.CORRELATION_ID.get();

            var result = chatApplicationService.sendMessage(
                    userId, otherUserId, chatroomId,
                    request.getAiModelId(),
                    request.getContent(),
                    fileId,
                    request.getFileContent().toByteArray(),
                    request.getFileOriginalName(),
                    request.getFileContentType(),
                    correlationId
            );

            SendMessageResponse response = SendMessageResponse.newBuilder()
                    .setMessage(toMessageDto(result.message()))
                    .setChatroomId(result.chatroomId().toString())
                    .setIsNewChatroom(result.isNewChatroom())
                    .build();

            responseObserver.onNext(response);
            responseObserver.onCompleted();
        } catch (Exception e) {
            responseObserver.onError(GrpcChatExceptionMapper.toStatusException(e));
        }
    }

    @Override
    public void getChatroom(GetChatroomRequest request, StreamObserver<ChatroomResponse> responseObserver) {
        try {
            String userId = GrpcContextKeys.USER_ID.get();
            UUID chatroomId = parseUuid(request.getChatroomId(), "chatroomId");
            UUID userUuid = parseUuid(userId, "userId");

            var chatroom = chatApplicationService.getChatroom(chatroomId, userUuid);
            List<ChatroomMemberEntity> members = chatApplicationService.getMembers(chatroomId);
            List<String> memberIds = members.stream().map(m -> m.getUserId().toString()).toList();

            ChatroomResponse response = ChatroomResponse.newBuilder()
                    .setId(chatroom.getId().toString())
                    .setType(chatroom.getType().name())
                    .addAllMemberIds(memberIds)
                    .setCreatedAt(chatroom.getCreatedAt().toString())
                    .build();
            responseObserver.onNext(response);
            responseObserver.onCompleted();
        } catch (Exception e) {
            responseObserver.onError(GrpcChatExceptionMapper.toStatusException(e));
        }
    }

    @Override
    public void listChatrooms(ListChatroomsRequest request, StreamObserver<ListChatroomsResponse> responseObserver) {
        try {
            UUID userId = parseUuid(request.getUserId(), "userId");
            var page = chatApplicationService.listChatrooms(userId, request.getPage(), request.getSize() == 0 ? 20 : request.getSize());

            ListChatroomsResponse.Builder builder = ListChatroomsResponse.newBuilder().setTotal(page.getTotalElements());
            for (var chatroom : page.getContent()) {
                List<ChatroomMemberEntity> members = chatApplicationService.getMembers(chatroom.getId());
                List<String> memberIds = members.stream().map(m -> m.getUserId().toString()).toList();
                builder.addChatrooms(ChatroomResponse.newBuilder()
                        .setId(chatroom.getId().toString())
                        .setType(chatroom.getType().name())
                        .addAllMemberIds(memberIds)
                        .setCreatedAt(chatroom.getCreatedAt().toString())
                        .build());
            }
            responseObserver.onNext(builder.build());
            responseObserver.onCompleted();
        } catch (Exception e) {
            responseObserver.onError(GrpcChatExceptionMapper.toStatusException(e));
        }
    }

    @Override
    public void listMessages(ListMessagesRequest request, StreamObserver<ListMessagesResponse> responseObserver) {
        try {
            UUID chatroomId = parseUuid(request.getChatroomId(), "chatroomId");
            UUID userId = parseUuid(request.getUserId(), "userId");
            var page = chatApplicationService.listMessages(chatroomId, userId, request.getPage(), request.getSize() == 0 ? 20 : request.getSize());

            ListMessagesResponse.Builder builder = ListMessagesResponse.newBuilder().setTotal(page.getTotalElements());
            page.getContent().forEach(msg -> builder.addMessages(toMessageDto(msg)));
            responseObserver.onNext(builder.build());
            responseObserver.onCompleted();
        } catch (Exception e) {
            responseObserver.onError(GrpcChatExceptionMapper.toStatusException(e));
        }
    }

    @Override
    public void sendTypingIndicator(TypingIndicatorRequest request, StreamObserver<SimpleResponse> responseObserver) {
        try {
            UUID userId = parseUuid(request.getUserId(), "userId");
            UUID chatroomId = parseUuid(request.getChatroomId(), "chatroomId");
            chatApplicationService.sendTypingIndicator(userId, chatroomId, request.getIsTyping());
            responseObserver.onNext(SimpleResponse.newBuilder().setMessage("OK").build());
            responseObserver.onCompleted();
        } catch (Exception e) {
            responseObserver.onError(GrpcChatExceptionMapper.toStatusException(e));
        }
    }

    @Override
    public void cancelMessage(CancelMessageRequest request, StreamObserver<SimpleResponse> responseObserver) {
        try {
            String userId = GrpcContextKeys.USER_ID.get();
            kafkaPublisher.publishCancellation(
                    request.getChatroomId(),
                    request.getMessageId(),
                    userId != null ? userId : request.getUserId()
            );
            responseObserver.onNext(SimpleResponse.newBuilder().setMessage("Cancellation requested").build());
            responseObserver.onCompleted();
        } catch (Exception e) {
            responseObserver.onError(GrpcChatExceptionMapper.toStatusException(e));
        }
    }

    @Override
    public void streamMessageResponse(StreamMessageRequest request, StreamObserver<MessageChunk> responseObserver) {
        // This is a server-streaming RPC. Actual streaming is driven by the RAG service via Kafka→Redis.
        // The gateway will use SSE; this stub serves as the gRPC contract.
        // Real implementations would subscribe to Redis pub/sub and push chunks.
        responseObserver.onCompleted();
    }

    private MessageDto toMessageDto(MessageEntity message) {
        MessageDto.Builder builder = MessageDto.newBuilder()
                .setId(message.getId().toString())
                .setChatroomId(message.getChatroomId().toString())
                .setSenderUserId(message.getSenderUserId().toString())
                .setCreatedAt(message.getCreatedAt().toString());
        if (message.getAiModelId() != null) builder.setAiModelId(message.getAiModelId());
        if (message.getContent() != null) builder.setContent(message.getContent());
        if (message.getFileId() != null) builder.setFileId(message.getFileId().toString());
        return builder.build();
    }

    private UUID parseUuid(String value, String fieldName) {
        if (value == null || value.isBlank()) {
            throw new InvalidChatOperationException(fieldName + " is required");
        }
        try {
            return UUID.fromString(value.trim());
        } catch (IllegalArgumentException e) {
            throw new InvalidChatOperationException("Invalid " + fieldName);
        }
    }

    private UUID parseOptionalUuid(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return UUID.fromString(value.trim());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
