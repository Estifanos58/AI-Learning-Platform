package com.aiplatform.chat.repository;

import com.aiplatform.chat.domain.ChatroomEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface ChatroomRepository extends JpaRepository<ChatroomEntity, UUID> {

    @Query("""
            select c from ChatroomEntity c
            join ChatroomMemberEntity m1 on m1.chatroomId = c.id
            join ChatroomMemberEntity m2 on m2.chatroomId = c.id
            where c.type = 'DIRECT'
              and m1.userId = :userId
              and m2.userId = :otherUserId
            """)
    Optional<ChatroomEntity> findDirectChatroom(@Param("userId") UUID userId, @Param("otherUserId") UUID otherUserId);

    @Query("""
            select c from ChatroomEntity c
            join ChatroomMemberEntity m on m.chatroomId = c.id
            where m.userId = :userId
            order by c.createdAt desc
            """)
    Page<ChatroomEntity> findByMemberId(@Param("userId") UUID userId, Pageable pageable);
}
