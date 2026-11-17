package com.aiplatform.profile.grpc.util;

import com.aiplatform.profile.domain.UserProfile;
import com.aiplatform.profile.proto.UserProfileResponse;
import com.aiplatform.profile.service.UserProfileApplicationService;

import java.time.format.DateTimeFormatter;

public final class UserProfileGrpcResponseMapper {

    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    private UserProfileGrpcResponseMapper() {
    }

    public static UserProfileResponse toResponse(UserProfile profile, UserProfileApplicationService userProfileApplicationService) {
        UserProfileResponse.Builder builder = UserProfileResponse.newBuilder()
                .setUserId(profile.getUserId().toString())
                .setVisibility(com.aiplatform.profile.proto.ProfileVisibility.valueOf(profile.getProfileVisibility().name()))
                .setReputationScore(profile.getReputationScore())
                .setCompletionScore(userProfileApplicationService.completionScore(profile))
                .setCreatedAt(TIME_FORMATTER.format(profile.getCreatedAt()))
                .setUpdatedAt(TIME_FORMATTER.format(profile.getUpdatedAt()));

        if (profile.getFirstName() != null) {
            builder.setFirstName(profile.getFirstName());
        }
        if (profile.getLastName() != null) {
            builder.setLastName(profile.getLastName());
        }
        if (profile.getUniversityId() != null) {
            builder.setUniversityId(profile.getUniversityId());
        }
        if (profile.getDepartment() != null) {
            builder.setDepartment(profile.getDepartment());
        }
        if (profile.getBio() != null) {
            builder.setBio(profile.getBio());
        }
        if (profile.getProfileImageFileId() != null) {
            builder.setProfileImageFileId(profile.getProfileImageFileId().toString());
        }

        return builder.build();
    }
}
