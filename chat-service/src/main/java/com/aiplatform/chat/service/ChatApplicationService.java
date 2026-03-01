package com.aiplatform.chat.service;

import com.aiplatform.chat.domain.AiModelEntity;
import com.aiplatform.chat.domain.ChatroomEntity;
import com.aiplatform.chat.domain.ChatroomRole;
import com.aiplatform.chat.domain.ChatroomUserEntity;
import com.aiplatform.chat.domain.MessageEntity;
import com.aiplatform.chat.exception.ChatNotFoundException;
import com.aiplatform.chat.exception.DuplicateMembershipException;
import com.aiplatform.chat.exception.InvalidChatOperationException;
import com.aiplatform.chat.exception.UnauthorizedChatAccessException;
import com.aiplatform.chat.repository.AiModelRepository;
import com.aiplatform.chat.repository.ChatroomRepository;
import com.aiplatform.chat.repository.ChatroomUserRepository;
import com.aiplatform.chat.repository.MessageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatApplicationService {

    private final ChatroomRepository chatroomRepository;
    private final ChatroomUserRepository chatroomUserRepository;
    private final MessageRepository messageRepository;
    private final AiModelRepository aiModelRepository;
    private final ChatRealtimePublisher chatRealtimePublisher;
    private final ChatAiEventPublisher chatAiEventPublisher;

    @Transactional
    public ChatroomEntity createOrGetDirectChat(UUID otherUserId, AuthenticatedPrincipal principal) {
        requirePrincipal(principal);
        if (otherUserId == null) {
            throw new InvalidChatOperationException("otherUserId is required");
        }
        if (principal.userId().equals(otherUserId)) {
            throw new InvalidChatOperationException("Cannot create direct chat with yourself");
        }

        return chatroomRepository.findDirectChatroom(principal.userId(), otherUserId)
                .orElseGet(() -> {
                    ChatroomEntity created = chatroomRepository.save(ChatroomEntity.builder()
                            .id(UUID.randomUUID())
                            .name(null)
                            .isGroup(Boolean.FALSE)
                            .avatarUrl(null)
                            .createdById(principal.userId())
                            .build());

                    chatroomUserRepository.save(ChatroomUserEntity.builder()
                            .id(UUID.randomUUID())
                            .chatroomId(created.getId())
                            .userId(principal.userId())
                            .role(ChatroomRole.MEMBER)
                            .build());
                    chatroomUserRepository.save(ChatroomUserEntity.builder()
                            .id(UUID.randomUUID())
                            .chatroomId(created.getId())
                            .userId(otherUserId)
                            .role(ChatroomRole.MEMBER)
                            .build());

                    chatRealtimePublisher.publishChatroomCreated(created.getId(), principal.userId(), principal.correlationId());
                    log.info("Direct chat created. chatroomId={}, createdById={}, correlationId={}",
                            created.getId(), principal.userId(), principal.correlationId());
                    return created;
                });
    }

    @Transactional
    public ChatroomEntity createGroupChat(String name, String avatarUrl, Set<UUID> memberUserIds, AuthenticatedPrincipal principal) {
        requirePrincipal(principal);
        String normalizedName = trimToNull(name);
        if (normalizedName == null) {
            throw new InvalidChatOperationException("Group name is required");
        }

        ChatroomEntity created = chatroomRepository.save(ChatroomEntity.builder()
                .id(UUID.randomUUID())
                .name(normalizedName)
                .isGroup(Boolean.TRUE)
                .avatarUrl(trimToNull(avatarUrl))
                .createdById(principal.userId())
                .build());

        chatroomUserRepository.save(ChatroomUserEntity.builder()
                .id(UUID.randomUUID())
                .chatroomId(created.getId())
                .userId(principal.userId())
                .role(ChatroomRole.ADMIN)
                .build());

        Set<UUID> uniqueMembers = new LinkedHashSet<>();
        if (memberUserIds != null) {
            uniqueMembers.addAll(memberUserIds);
        }
        uniqueMembers.remove(principal.userId());

        uniqueMembers.forEach(userId -> chatroomUserRepository.save(ChatroomUserEntity.builder()
                .id(UUID.randomUUID())
                .chatroomId(created.getId())
                .userId(userId)
                .role(ChatroomRole.MEMBER)
                .build()));

        chatRealtimePublisher.publishChatroomCreated(created.getId(), principal.userId(), principal.correlationId());
        log.info("Group chat created. chatroomId={}, createdById={}, memberCount={}, correlationId={}",
                created.getId(), principal.userId(), uniqueMembers.size() + 1, principal.correlationId());
        return created;
    }

    @Transactional
    public MessageEntity sendMessage(UUID chatroomId, String content, String imageUrl, UUID aiModelId, AuthenticatedPrincipal principal) {
        requirePrincipal(principal);
        ChatroomEntity chatroom = requireChatroom(chatroomId);
        ChatroomUserEntity membership = requireMembership(chatroomId, principal.userId());

        if (membership.getRole() == ChatroomRole.AI_MODEL) {
            throw new UnauthorizedChatAccessException("AI_MODEL role cannot send manual messages");
        }

        String normalizedContent = trimToNull(content);
        String normalizedImageUrl = trimToNull(imageUrl);
        if (normalizedContent == null && normalizedImageUrl == null) {
            throw new InvalidChatOperationException("Message content or imageUrl is required");
        }

        if (aiModelId != null) {
            requireActiveAiModel(aiModelId);
        }

        MessageEntity saved = messageRepository.save(MessageEntity.builder()
                .id(UUID.randomUUID())
                .chatroomId(chatroom.getId())
                .userId(principal.userId())
                .content(normalizedContent)
                .imageUrl(normalizedImageUrl)
                .aiModelId(aiModelId)
                .isEdited(Boolean.FALSE)
                .build());

        chatroom.setUpdatedAt(LocalDateTime.now());
        chatroomRepository.save(chatroom);

        chatRealtimePublisher.publishMessageSent(chatroomId, saved.getId(), principal.userId(), normalizedContent, principal.correlationId());
        if (aiModelId != null) {
            chatAiEventPublisher.publishAiRequested(saved, principal.correlationId());
        }

        log.info("Message sent. messageId={}, chatroomId={}, userId={}, correlationId={}",
                saved.getId(), saved.getChatroomId(), saved.getUserId(), principal.correlationId());
        return saved;
    }

    @Transactional(readOnly = true)
    public Page<MessageEntity> listMessages(UUID chatroomId, int page, int size, AuthenticatedPrincipal principal) {
        requirePrincipal(principal);
        requireMembership(chatroomId, principal.userId());
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100));
        return messageRepository.findByChatroomIdAndDeletedAtIsNullOrderByCreatedAtDesc(chatroomId, pageable);
    }

    @Transactional
    public void addMember(UUID chatroomId, UUID userId, ChatroomRole role, AuthenticatedPrincipal principal) {
        requirePrincipal(principal);
        requireAdmin(chatroomId, principal.userId());
        requireChatroom(chatroomId);
        if (userId == null) {
            throw new InvalidChatOperationException("userId is required");
        }
        if (chatroomUserRepository.existsByChatroomIdAndUserId(chatroomId, userId)) {
            throw new DuplicateMembershipException("User is already a member of this chatroom");
        }

        ChatroomRole memberRole = role == null ? ChatroomRole.MEMBER : role;
        chatroomUserRepository.save(ChatroomUserEntity.builder()
                .id(UUID.randomUUID())
                .chatroomId(chatroomId)
                .userId(userId)
                .role(memberRole)
                .build());
    }

    @Transactional
    public void removeMember(UUID chatroomId, UUID userId, AuthenticatedPrincipal principal) {
        requirePrincipal(principal);
        requireAdmin(chatroomId, principal.userId());
        ChatroomUserEntity target = requireMembership(chatroomId, userId);
        chatroomUserRepository.delete(target);
    }

    @Transactional
    public void markAsRead(UUID chatroomId, AuthenticatedPrincipal principal) {
        requirePrincipal(principal);
        ChatroomUserEntity membership = requireMembership(chatroomId, principal.userId());
        membership.setLastReadAt(LocalDateTime.now());
        chatroomUserRepository.save(membership);
    }

    @Transactional(readOnly = true)
    public Page<ChatroomEntity> getMyChatrooms(int page, int size, AuthenticatedPrincipal principal) {
        requirePrincipal(principal);
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100));
        return chatroomRepository.findMyChatrooms(principal.userId(), pageable);
    }

    @Transactional
    public void addAiModelToChat(UUID chatroomId, UUID aiModelId, AuthenticatedPrincipal principal) {
        requirePrincipal(principal);
        requireAdmin(chatroomId, principal.userId());
        AiModelEntity aiModel = requireActiveAiModel(aiModelId);

        if (chatroomUserRepository.existsByChatroomIdAndUserId(chatroomId, aiModel.getId())) {
            throw new DuplicateMembershipException("AI model already added to this chatroom");
        }

        chatroomUserRepository.save(ChatroomUserEntity.builder()
                .id(UUID.randomUUID())
                .chatroomId(chatroomId)
                .userId(aiModel.getId())
                .role(ChatroomRole.AI_MODEL)
                .build());
    }

    @Transactional(readOnly = true)
    public void typingEvent(UUID chatroomId, boolean typing, AuthenticatedPrincipal principal) {
        requirePrincipal(principal);
        requireMembership(chatroomId, principal.userId());
        chatRealtimePublisher.publishTyping(chatroomId, principal.userId(), typing, principal.correlationId());
    }

    private ChatroomEntity requireChatroom(UUID chatroomId) {
        if (chatroomId == null) {
            throw new InvalidChatOperationException("chatroomId is required");
        }
        return chatroomRepository.findByIdAndDeletedAtIsNull(chatroomId)
                .orElseThrow(() -> new ChatNotFoundException("Chatroom not found"));
    }

    private ChatroomUserEntity requireMembership(UUID chatroomId, UUID userId) {
        if (userId == null) {
            throw new UnauthorizedChatAccessException("Missing authenticated user metadata");
        }
        return chatroomUserRepository.findByChatroomIdAndUserId(chatroomId, userId)
                .orElseThrow(() -> new UnauthorizedChatAccessException("Only members can perform this action"));
    }

    private void requireAdmin(UUID chatroomId, UUID userId) {
        ChatroomUserEntity membership = requireMembership(chatroomId, userId);
        if (membership.getRole() != ChatroomRole.ADMIN) {
            throw new UnauthorizedChatAccessException("Only ADMIN can perform this action");
        }
    }

    private AiModelEntity requireActiveAiModel(UUID aiModelId) {
        if (aiModelId == null) {
            throw new InvalidChatOperationException("aiModelId is required");
        }
        return aiModelRepository.findByIdAndIsActiveTrue(aiModelId)
                .orElseThrow(() -> new InvalidChatOperationException("AI model not found or inactive"));
    }

    private String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private void requirePrincipal(AuthenticatedPrincipal principal) {
        if (principal == null || principal.userId() == null) {
            throw new UnauthorizedChatAccessException("Missing authenticated user metadata");
        }
    }
}
