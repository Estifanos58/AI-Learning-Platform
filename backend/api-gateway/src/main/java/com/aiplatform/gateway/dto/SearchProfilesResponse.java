package com.aiplatform.gateway.dto;

import java.util.List;

public record SearchProfilesResponse(
        List<UserProfileResponse> profiles,
        long total
) {
}
