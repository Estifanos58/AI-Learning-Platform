package com.aiplatform.gateway.dto;

import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
        @Size(max = 100) String firstName,
        @Size(max = 100) String lastName,
        @Size(max = 50) String universityId,
        @Size(max = 100) String department,
        @Size(max = 2000) String bio,
        String profileImageFileId
) {
}
