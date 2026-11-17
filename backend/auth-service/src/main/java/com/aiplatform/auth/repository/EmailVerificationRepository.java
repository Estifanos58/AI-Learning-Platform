package com.aiplatform.auth.repository;

import com.aiplatform.auth.domain.EmailVerification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EmailVerificationRepository extends JpaRepository<EmailVerification, UUID> {

    Optional<EmailVerification> findTopByVerificationCodeAndUsedFalseOrderByCreatedAtDesc(String verificationCode);

    List<EmailVerification> findByUserIdAndUsedFalse(UUID userId);

    @Modifying
    @Query("update EmailVerification e set e.used = true where e.user.id = :userId and e.used = false")
    int invalidateActiveCodesByUserId(@Param("userId") UUID userId);
}