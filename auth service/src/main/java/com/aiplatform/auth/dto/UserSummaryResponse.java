package com.aiplatform.auth.dto;

import com.aiplatform.auth.domain.Role;
import com.aiplatform.auth.domain.UserStatus;

import java.util.UUID;

public record UserSummaryResponse(
        UUID id,
        String email,
        String username,
        Role role,
        UserStatus status,
        Boolean emailVerified
) {
}