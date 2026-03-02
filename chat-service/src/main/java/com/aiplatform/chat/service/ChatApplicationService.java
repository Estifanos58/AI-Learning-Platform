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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    private final FileServiceClient fileServiceClient;

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
                .build();
        messageRepository.save(message);

        // Publish via Redis for WebSocket fanout
        if (isNewChatroom && otherUserId != null) {
            redisPublisher.publishNewChatroomWithMessage(message, otherUserId);
        } else {
            redisPublisher.publishNewMessage(message);
        }

        // Publish to Kafka for AI processing
        kafkaPublisher.publishAiMessageRequested(message);

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
        return messageRepository.findByChatroomIdOrderByCreatedAtDesc(chatroomId, PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100)));
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
