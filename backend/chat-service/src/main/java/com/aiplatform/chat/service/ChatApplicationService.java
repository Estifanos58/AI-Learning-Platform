package com.aiplatform.chat.service;

import com.aiplatform.chat.domain.ChatroomEntity;
import com.aiplatform.chat.domain.ChatroomMemberEntity;
import com.aiplatform.chat.domain.ChatroomType;
import com.aiplatform.chat.domain.MessageEntity;
import com.aiplatform.chat.exception.ChatroomNotFoundException;
import com.aiplatform.chat.exception.InvalidChatOperationException;
import com.aiplatform.chat.exception.UnauthorizedChatAccessException;
import com.aiplatform.chat.repository.ChatroomMemberRepository;
import com.aiplatform.chat.repository.ChatroomRepository;
import com.aiplatform.chat.repository.MessageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatApplicationService {

    private final ChatroomRepository chatroomRepository;
    private final ChatroomMemberRepository chatroomMemberRepository;
    private final MessageRepository messageRepository;
    private final ChatRedisPublisher redisPublisher;
    private final ChatKafkaPublisher kafkaPublisher;
    private final RagExecutionClient ragExecutionClient;
    private final FileServiceClient fileServiceClient;

    @Value("${app.ai.transport:kafka}")
    private String aiTransport;

    @Transactional
    public SendMessageResult sendMessage(
            UUID userId,
            UUID otherUserId,
            UUID chatroomId,
            String aiModelId,
            String content,
            UUID fileId,
            byte[] fileContent,
            String fileOriginalName,
            String fileContentType,
            String correlationId
    ) {
        if (userId == null) {
            throw new InvalidChatOperationException("userId is required");
        }
        if (otherUserId == null && chatroomId == null && (aiModelId == null || aiModelId.isBlank())) {
            throw new InvalidChatOperationException("Must provide otherUserId, chatroomId, or aiModelId");
        }
        if (otherUserId != null && otherUserId.equals(userId)) {
            throw new InvalidChatOperationException("Cannot create a direct chat with yourself");
        }
        if ((content == null || content.isBlank()) && fileId == null && (fileContent == null || fileContent.length == 0)) {
            throw new InvalidChatOperationException("Must provide content, fileId, or file");
        }

        // Handle file upload if raw bytes provided
        UUID resolvedFileId = fileId;
        if (fileContent != null && fileContent.length > 0) {
            resolvedFileId = fileServiceClient.uploadChatFile(userId, fileOriginalName, fileContentType, fileContent, correlationId);
        }

        // Resolve or create chatroom
        boolean isNewChatroom = false;
        ChatroomEntity chatroom;

        if (chatroomId != null) {
            chatroom = chatroomRepository.findById(chatroomId)
                    .orElseThrow(() -> new ChatroomNotFoundException("Chatroom not found"));
            validateMembership(chatroom.getId(), userId);
        } else if (otherUserId != null) {
            var existing = chatroomRepository.findDirectChatroom(userId, otherUserId);
            if (existing.isPresent()) {
                chatroom = existing.get();
            } else {
                chatroom = ChatroomEntity.builder()
                        .id(UUID.randomUUID())
                        .type(ChatroomType.DIRECT)
                        .build();
                chatroomRepository.save(chatroom);
                chatroomMemberRepository.save(ChatroomMemberEntity.builder()
                        .id(UUID.randomUUID())
                        .chatroomId(chatroom.getId())
                        .userId(userId)
                        .build());
                chatroomMemberRepository.save(ChatroomMemberEntity.builder()
                        .id(UUID.randomUUID())
                        .chatroomId(chatroom.getId())
                        .userId(otherUserId)
                        .build());
                isNewChatroom = true;
            }
        } else {
            // AI chatroom
            chatroom = ChatroomEntity.builder()
                    .id(UUID.randomUUID())
                    .type(ChatroomType.AI)
                    .build();
            chatroomRepository.save(chatroom);
            chatroomMemberRepository.save(ChatroomMemberEntity.builder()
                    .id(UUID.randomUUID())
                    .chatroomId(chatroom.getId())
                    .userId(userId)
                    .build());
            isNewChatroom = true;
        }

        // Persist message
        MessageEntity message = MessageEntity.builder()
                .id(UUID.randomUUID())
                .chatroomId(chatroom.getId())
                .senderUserId(userId)
                .aiModelId(aiModelId != null && !aiModelId.isBlank() ? aiModelId : null)
                .content(content)
                .fileId(resolvedFileId)
                .createdAt(LocalDateTime.now())
                .build();
        messageRepository.saveAndFlush(message);

        // Publish via Redis for WebSocket fanout (best-effort, must not rollback DB save)
        try {
            if (isNewChatroom && otherUserId != null) {
                redisPublisher.publishNewChatroomWithMessage(message, otherUserId, userId);
                redisPublisher.publishNewChatroomWithMessage(message, userId, otherUserId);
            } else {
                redisPublisher.publishNewMessage(message);
            }
        } catch (Exception e) {
            log.error("Failed to publish message to Redis. messageId={}, chatroomId={}",
                    message.getId(), message.getChatroomId(), e);
        }

        boolean useKafka = "kafka".equalsIgnoreCase(aiTransport) || "dual".equalsIgnoreCase(aiTransport);
        boolean useGrpc = "grpc".equalsIgnoreCase(aiTransport) || "dual".equalsIgnoreCase(aiTransport);

        if (useKafka) {
            try {
                kafkaPublisher.publishAiMessageRequested(message);
            } catch (Exception e) {
                log.error("Failed to publish message to Kafka. messageId={}, chatroomId={}",
                        message.getId(), message.getChatroomId(), e);
            }
        }

        if (useGrpc) {
            try {
                ragExecutionClient.executeChat(message, correlationId);
            } catch (Exception e) {
                log.error("Failed to submit AI execution via gRPC. messageId={}, chatroomId={}",
                        message.getId(), message.getChatroomId(), e);
            }
        }

        log.info("Message sent. messageId={}, chatroomId={}, senderUserId={}, isNewChatroom={}",
                message.getId(), message.getChatroomId(), userId, isNewChatroom);

        return new SendMessageResult(message, chatroom.getId(), isNewChatroom);
    }

    @Transactional(readOnly = true)
    public ChatroomEntity getChatroom(UUID chatroomId, UUID userId) {
        ChatroomEntity chatroom = chatroomRepository.findById(chatroomId)
                .orElseThrow(() -> new ChatroomNotFoundException("Chatroom not found"));
        validateMembership(chatroomId, userId);
        return chatroom;
    }

    @Transactional(readOnly = true)
    public Page<ChatroomEntity> listChatrooms(UUID userId, int page, int size) {
        return chatroomRepository.findByMemberId(userId, PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100)));
    }

    @Transactional(readOnly = true)
    public Page<MessageEntity> listMessages(UUID chatroomId, UUID userId, int page, int size) {
        chatroomRepository.findById(chatroomId)
                .orElseThrow(() -> new ChatroomNotFoundException("Chatroom not found"));
        validateMembership(chatroomId, userId);
        return messageRepository.findByChatroomIdOrderByCreatedAtAsc(chatroomId, PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100)));
    }

    @Transactional(readOnly = true)
    public List<ChatroomMemberEntity> getMembers(UUID chatroomId) {
        return chatroomMemberRepository.findByChatroomId(chatroomId);
    }

    public void sendTypingIndicator(UUID userId, UUID chatroomId, boolean isTyping) {
        redisPublisher.publishTypingIndicator(userId, chatroomId, isTyping);
    }

    private void validateMembership(UUID chatroomId, UUID userId) {
        if (!chatroomMemberRepository.existsByChatroomIdAndUserId(chatroomId, userId)) {
            throw new UnauthorizedChatAccessException("User is not a member of this chatroom");
        }
    }

    public record SendMessageResult(MessageEntity message, UUID chatroomId, boolean isNewChatroom) {}
}
