package com.aiplatform.profile.repository;

import com.aiplatform.profile.domain.UserProfile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface UserProfileRepository extends JpaRepository<UserProfile, UUID> {

    Optional<UserProfile> findByUserIdAndDeletedFalse(UUID userId);

    boolean existsByUserId(UUID userId);

    @Query("""
            select p
            from UserProfile p
            where p.deleted = false
              and (:universityId is null or p.universityId = :universityId)
              and (:department is null or p.department = :department)
              and (
                    :nameQuery is null
                    or lower(concat(coalesce(p.firstName, ''), ' ', coalesce(p.lastName, ''))) like lower(concat('%', :nameQuery, '%'))
              )
            """)
    Page<UserProfile> search(
            @Param("universityId") String universityId,
            @Param("department") String department,
            @Param("nameQuery") String nameQuery,
            Pageable pageable
    );
}
