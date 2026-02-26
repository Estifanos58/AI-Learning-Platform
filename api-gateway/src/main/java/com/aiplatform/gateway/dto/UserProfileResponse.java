package com.aiplatform.gateway.dto;

import com.aiplatform.profile.proto.ProfileVisibility;

public record UserProfileResponse(
        String userId,
        String firstName,
        String lastName,
        String universityId,
        String department,
        String bio,
        String avatarUrl,
        ProfileVisibility visibility,
        int reputationScore,
        int completionScore,
        String createdAt,
        String updatedAt
) {
}
