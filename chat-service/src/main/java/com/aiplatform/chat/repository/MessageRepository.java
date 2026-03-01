package com.aiplatform.chat.repository;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.aiplatform.chat.domain.MessageEntity;

public interface MessageRepository extends JpaRepository<MessageEntity, UUID> {

    Page<MessageEntity> findByChatroomIdAndDeletedAtIsNullOrderByCreatedAtDesc(UUID chatroomId, Pageable pageable);
}
