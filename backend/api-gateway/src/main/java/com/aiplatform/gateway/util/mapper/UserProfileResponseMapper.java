package com.aiplatform.gateway.util.mapper;

import com.aiplatform.gateway.dto.UserProfileResponse;

public final class UserProfileResponseMapper {

    private UserProfileResponseMapper() {
    }

    public static UserProfileResponse toDto(com.aiplatform.profile.proto.UserProfileResponse response) {
        return new UserProfileResponse(
                response.getUserId(),
                response.getFirstName(),
                response.getLastName(),
                response.getUniversityId(),
                response.getDepartment(),
                response.getBio(),
                response.getProfileImageFileId(),
                response.getVisibility(),
                response.getReputationScore(),
                response.getCompletionScore(),
                response.getCreatedAt(),
                response.getUpdatedAt()
        );
    }
}
