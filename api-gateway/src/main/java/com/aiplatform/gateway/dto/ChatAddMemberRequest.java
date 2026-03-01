package com.aiplatform.gateway.dto;

import com.aiplatform.chat.proto.ChatroomUserRole;
import jakarta.validation.constraints.NotBlank;

public record ChatAddMemberRequest(
        @NotBlank String userId,
        ChatroomUserRole role
) {
}
