package com.aiplatform.gateway.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record ChatCreateGroupRequest(
        @NotBlank String name,
        String avatarUrl,
        @NotNull List<String> memberUserIds
) {
}
