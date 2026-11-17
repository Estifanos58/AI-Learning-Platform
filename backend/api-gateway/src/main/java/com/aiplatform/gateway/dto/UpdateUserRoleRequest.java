package com.aiplatform.gateway.dto;

import com.aiplatform.auth.proto.Role;
import jakarta.validation.constraints.NotNull;

public record UpdateUserRoleRequest(
        @NotNull Role role
) {
}
