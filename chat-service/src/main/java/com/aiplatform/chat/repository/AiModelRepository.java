package com.aiplatform.chat.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.aiplatform.chat.domain.AiModelEntity;

public interface AiModelRepository extends JpaRepository<AiModelEntity, UUID> {

    Optional<AiModelEntity> findByIdAndIsActiveTrue(UUID id);
}
