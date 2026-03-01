package com.aiplatform.chat.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.aiplatform.chat.domain.ChatroomRole;
import com.aiplatform.chat.domain.ChatroomUserEntity;

public interface ChatroomUserRepository extends JpaRepository<ChatroomUserEntity, UUID> {

    Optional<ChatroomUserEntity> findByChatroomIdAndUserId(UUID chatroomId, UUID userId);

    boolean existsByChatroomIdAndUserId(UUID chatroomId, UUID userId);

    boolean existsByChatroomIdAndUserIdAndRole(UUID chatroomId, UUID userId, ChatroomRole role);

    List<ChatroomUserEntity> findAllByChatroomId(UUID chatroomId);
}
