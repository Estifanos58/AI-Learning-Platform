package com.aiplatform.profile.grpc;

import com.aiplatform.profile.domain.ProfileVisibility;
import com.aiplatform.profile.domain.UserProfile;
import com.aiplatform.profile.exception.DuplicateProfileException;
import com.aiplatform.profile.exception.InvalidUpdateException;
import com.aiplatform.profile.exception.ProfileNotFoundException;
import com.aiplatform.profile.exception.UnauthorizedAccessException;
import com.aiplatform.profile.proto.GetMyProfileRequest;
import com.aiplatform.profile.proto.GetProfileRequest;
import com.aiplatform.profile.proto.IncrementReputationRequest;
import com.aiplatform.profile.proto.SearchProfilesRequest;
import com.aiplatform.profile.proto.SearchProfilesResponse;
import com.aiplatform.profile.proto.SimpleResponse;
import com.aiplatform.profile.proto.UpdateProfileRequest;
import com.aiplatform.profile.proto.UpdateVisibilityRequest;
import com.aiplatform.profile.proto.UserProfileResponse;
import com.aiplatform.profile.proto.UserProfileServiceGrpc;
import com.aiplatform.profile.service.AuthenticatedPrincipal;
import com.aiplatform.profile.service.UserProfileApplicationService;
import io.grpc.Status;
import io.grpc.stub.StreamObserver;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.devh.boot.grpc.server.service.GrpcService;

import java.time.format.DateTimeFormatter;
import java.util.UUID;

@Slf4j
@GrpcService
@RequiredArgsConstructor
public class UserProfileGrpcService extends UserProfileServiceGrpc.UserProfileServiceImplBase {

    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    private final UserProfileApplicationService userProfileApplicationService;

    @Override
    public void getMyProfile(GetMyProfileRequest request, StreamObserver<UserProfileResponse> responseObserver) {
        try {
            AuthenticatedPrincipal principal = requirePrincipal();
            UserProfile profile = userProfileApplicationService.getMyProfile(principal);
            responseObserver.onNext(toResponse(profile));
            responseObserver.onCompleted();
        } catch (Exception exception) {
            responseObserver.onError(toStatusException(exception));
        }
    }

    @Override
    public void getProfileById(GetProfileRequest request, StreamObserver<UserProfileResponse> responseObserver) {
        try {
            UUID targetUserId = UUID.fromString(request.getUserId());
            AuthenticatedPrincipal principal = currentPrincipal();
            UserProfile profile = userProfileApplicationService.getProfileById(targetUserId, principal);
            responseObserver.onNext(toResponse(profile));
            responseObserver.onCompleted();
        } catch (Exception exception) {
            responseObserver.onError(toStatusException(exception));
        }
    }

    @Override
    public void updateMyProfile(UpdateProfileRequest request, StreamObserver<UserProfileResponse> responseObserver) {
        try {
            AuthenticatedPrincipal principal = requirePrincipal();
            UserProfile updated = userProfileApplicationService.updateMyProfile(
                    principal,
                    request.getFirstName(),
                    request.getLastName(),
                    request.getUniversityId(),
                    request.getDepartment(),
                    request.getBio(),
                    request.getAvatarUrl()
            );
            responseObserver.onNext(toResponse(updated));
            responseObserver.onCompleted();
        } catch (Exception exception) {
            responseObserver.onError(toStatusException(exception));
        }
    }

    @Override
    public void searchProfiles(SearchProfilesRequest request, StreamObserver<SearchProfilesResponse> responseObserver) {
        try {
            AuthenticatedPrincipal principal = currentPrincipal();
            var profilesPage = userProfileApplicationService.searchProfiles(
                    principal,
                    request.getUniversityId(),
                    request.getDepartment(),
                    request.getNameQuery(),
                    request.getPage(),
                    request.getSize() == 0 ? 20 : request.getSize()
            );

            SearchProfilesResponse.Builder builder = SearchProfilesResponse.newBuilder()
                    .setTotal(profilesPage.getTotalElements());

            profilesPage.getContent().forEach(profile -> builder.addProfiles(toResponse(profile)));

            responseObserver.onNext(builder.build());
            responseObserver.onCompleted();
        } catch (Exception exception) {
            responseObserver.onError(toStatusException(exception));
        }
    }

    @Override
    public void updateProfileVisibility(UpdateVisibilityRequest request, StreamObserver<SimpleResponse> responseObserver) {
        try {
            AuthenticatedPrincipal principal = requirePrincipal();
            ProfileVisibility visibility = ProfileVisibility.valueOf(request.getVisibility().name());
            userProfileApplicationService.updateVisibility(principal, visibility);
            responseObserver.onNext(SimpleResponse.newBuilder().setMessage("Profile visibility updated").build());
            responseObserver.onCompleted();
        } catch (Exception exception) {
            responseObserver.onError(toStatusException(exception));
        }
    }

    @Override
    public void incrementReputation(IncrementReputationRequest request, StreamObserver<SimpleResponse> responseObserver) {
        try {
            UUID userId = UUID.fromString(request.getUserId());
            userProfileApplicationService.incrementReputation(userId, request.getAmount(), GrpcContextKeys.CORRELATION_ID.get());
            responseObserver.onNext(SimpleResponse.newBuilder().setMessage("Reputation incremented").build());
            responseObserver.onCompleted();
        } catch (Exception exception) {
            responseObserver.onError(toStatusException(exception));
        }
    }

    private AuthenticatedPrincipal requirePrincipal() {
        AuthenticatedPrincipal principal = currentPrincipal();
        if (principal == null || principal.userId() == null) {
            throw new UnauthorizedAccessException("Missing authenticated user metadata");
        }
        return principal;
    }

    private AuthenticatedPrincipal currentPrincipal() {
        String rawUserId = GrpcContextKeys.USER_ID.get();
        UUID userId = null;
        if (rawUserId != null && !rawUserId.isBlank()) {
            userId = UUID.fromString(rawUserId);
        }
        return new AuthenticatedPrincipal(
                userId,
                GrpcContextKeys.UNIVERSITY_ID.get(),
                GrpcContextKeys.USER_ROLES.get(),
                GrpcContextKeys.CORRELATION_ID.get()
        );
    }

    private UserProfileResponse toResponse(UserProfile profile) {
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
        if (profile.getAvatarUrl() != null) {
            builder.setAvatarUrl(profile.getAvatarUrl());
        }

        return builder.build();
    }

    private io.grpc.StatusException toStatusException(Exception exception) {
        if (exception instanceof ProfileNotFoundException) {
            return Status.NOT_FOUND.withDescription(exception.getMessage()).asException();
        }
        if (exception instanceof UnauthorizedAccessException) {
            return Status.PERMISSION_DENIED.withDescription(exception.getMessage()).asException();
        }
        if (exception instanceof InvalidUpdateException || exception instanceof IllegalArgumentException) {
            return Status.INVALID_ARGUMENT.withDescription(exception.getMessage()).asException();
        }
        if (exception instanceof DuplicateProfileException) {
            return Status.ALREADY_EXISTS.withDescription(exception.getMessage()).asException();
        }
        return Status.INTERNAL.withDescription("Unexpected internal error").withCause(exception).asException();
    }
}
