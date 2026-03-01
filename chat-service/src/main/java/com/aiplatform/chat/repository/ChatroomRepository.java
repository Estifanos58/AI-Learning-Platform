package com.aiplatform.chat.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.aiplatform.chat.domain.ChatroomEntity;

public interface ChatroomRepository extends JpaRepository<ChatroomEntity, UUID> {

    Optional<ChatroomEntity> findByIdAndDeletedAtIsNull(UUID id);

    @Query(value = """
            SELECT c.*
            FROM chatrooms c
            JOIN chatroom_users cu ON cu.chatroom_id = c.id
            WHERE c.is_group = FALSE
              AND c.deleted_at IS NULL
            GROUP BY c.id
            HAVING COUNT(*) = 2
               AND SUM(CASE WHEN cu.user_id IN (:userA, :userB) THEN 1 ELSE 0 END) = 2
            LIMIT 1
            """, nativeQuery = true)
    Optional<ChatroomEntity> findDirectChatroom(@Param("userA") UUID userA, @Param("userB") UUID userB);

    @Query("""
            select c
            from ChatroomEntity c
            join ChatroomUserEntity cu on cu.chatroomId = c.id
            where cu.userId = :userId
              and c.deletedAt is null
            order by c.updatedAt desc
            """)
    Page<ChatroomEntity> findMyChatrooms(@Param("userId") UUID userId, Pageable pageable);
}
