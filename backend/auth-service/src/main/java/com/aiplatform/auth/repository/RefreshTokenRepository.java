package com.aiplatform.auth.repository;

import com.aiplatform.auth.domain.RefreshToken;
import com.aiplatform.auth.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {

    Optional<RefreshToken> findByTokenHash(String tokenHash);

    List<RefreshToken> findByUserAndRevokedFalseAndExpiresAtAfter(User user, LocalDateTime now);
}