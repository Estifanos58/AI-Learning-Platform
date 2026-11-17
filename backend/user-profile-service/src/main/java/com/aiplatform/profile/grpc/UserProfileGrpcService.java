package com.aiplatform.profile.grpc;

import com.aiplatform.profile.domain.ProfileVisibility;
import com.aiplatform.profile.domain.UserProfile;
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
import com.aiplatform.profile.grpc.util.UserProfileGrpcExceptionMapper;
import com.aiplatform.profile.grpc.util.UserProfileGrpcPrincipalResolver;
import com.aiplatform.profile.grpc.util.UserProfileGrpcRequestParser;
import com.aiplatform.profile.grpc.util.UserProfileGrpcResponseMapper;
import com.aiplatform.profile.service.AuthenticatedPrincipal;
import com.aiplatform.profile.service.UserProfileApplicationService;
import io.grpc.stub.StreamObserver;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.devh.boot.grpc.server.service.GrpcService;

import java.util.UUID;

@Slf4j
@GrpcService
@RequiredArgsConstructor
public class UserProfileGrpcService extends UserProfileServiceGrpc.UserProfileServiceImplBase {

    private final UserProfileApplicationService userProfileApplicationService;

    @Override
    public void getMyProfile(GetMyProfileRequest request, StreamObserver<UserProfileResponse> responseObserver) {


        try{
            AuthenticatedPrincipal principal = UserProfileGrpcPrincipalResolver.requirePrincipal();
            log.info("User profile request just resevied ={}", principal.userId());
            UserProfile profile = userProfileApplicationService.getMyProfile(principal);
            responseObserver.onNext(UserProfileGrpcResponseMapper.toResponse(profile, userProfileApplicationService));
            responseObserver.onCompleted();
        } catch (Exception exception) {
            responseObserver.onError(UserProfileGrpcExceptionMapper.toStatusException(exception));
        }
    }

    @Override
    public void getProfileById(GetProfileRequest request, StreamObserver<UserProfileResponse> responseObserver) {
        try {
            UUID targetUserId = UUID.fromString(request.getUserId());
            AuthenticatedPrincipal principal = UserProfileGrpcPrincipalResolver.currentPrincipal();
            UserProfile profile = userProfileApplicationService.getProfileById(targetUserId, principal);
            responseObserver.onNext(UserProfileGrpcResponseMapper.toResponse(profile, userProfileApplicationService));
            responseObserver.onCompleted();
        } catch (Exception exception) {
            responseObserver.onError(UserProfileGrpcExceptionMapper.toStatusException(exception));
        }
    }

    @Override
    public void updateMyProfile(UpdateProfileRequest request, StreamObserver<UserProfileResponse> responseObserver) {
        try {
            AuthenticatedPrincipal principal = UserProfileGrpcPrincipalResolver.requirePrincipal();
            UserProfile updated = userProfileApplicationService.updateMyProfile(
                    principal,
                    request.getFirstName(),
                    request.getLastName(),
                    request.getUniversityId(),
                    request.getDepartment(),
                    request.getBio(),
                    UserProfileGrpcRequestParser.parseOptionalUuid(request.getProfileImageFileId())
            );
            responseObserver.onNext(UserProfileGrpcResponseMapper.toResponse(updated, userProfileApplicationService));
            responseObserver.onCompleted();
        } catch (Exception exception) {
            responseObserver.onError(UserProfileGrpcExceptionMapper.toStatusException(exception));
        }
    }

    @Override
    public void searchProfiles(SearchProfilesRequest request, StreamObserver<SearchProfilesResponse> responseObserver) {
        try {
            AuthenticatedPrincipal principal = UserProfileGrpcPrincipalResolver.currentPrincipal();
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

            profilesPage.getContent().forEach(profile -> builder.addProfiles(UserProfileGrpcResponseMapper.toResponse(profile, userProfileApplicationService)));

            responseObserver.onNext(builder.build());
            responseObserver.onCompleted();
        } catch (Exception exception) {
            responseObserver.onError(UserProfileGrpcExceptionMapper.toStatusException(exception));
        }
    }

    @Override
    public void updateProfileVisibility(UpdateVisibilityRequest request, StreamObserver<SimpleResponse> responseObserver) {
        try {
            AuthenticatedPrincipal principal = UserProfileGrpcPrincipalResolver.requirePrincipal();
            ProfileVisibility visibility = ProfileVisibility.valueOf(request.getVisibility().name());
            userProfileApplicationService.updateVisibility(principal, visibility);
            responseObserver.onNext(SimpleResponse.newBuilder().setMessage("Profile visibility updated").build());
            responseObserver.onCompleted();
        } catch (Exception exception) {
            responseObserver.onError(UserProfileGrpcExceptionMapper.toStatusException(exception));
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
            responseObserver.onError(UserProfileGrpcExceptionMapper.toStatusException(exception));
        }
    }
}
