package com.aiplatform.chat.repository;

import com.aiplatform.chat.domain.ChatroomMemberEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ChatroomMemberRepository extends JpaRepository<ChatroomMemberEntity, UUID> {

    List<ChatroomMemberEntity> findByChatroomId(UUID chatroomId);

    boolean existsByChatroomIdAndUserId(UUID chatroomId, UUID userId);
}
