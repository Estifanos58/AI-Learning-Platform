package com.aiplatform.gateway.controller;

import com.aiplatform.gateway.config.GrpcProfileProperties;
import com.aiplatform.gateway.dto.ApiMessageResponse;
import com.aiplatform.gateway.dto.IncrementReputationRequest;
import com.aiplatform.gateway.dto.ProfileVisibilityUpdateRequest;
import com.aiplatform.gateway.dto.SearchProfilesResponse;
import com.aiplatform.gateway.dto.UpdateProfileRequest;
import com.aiplatform.gateway.dto.UserProfileResponse;
import com.aiplatform.gateway.security.JwtValidationService;
import com.aiplatform.profile.proto.GetMyProfileRequest;
import com.aiplatform.profile.proto.GetProfileRequest;
import com.aiplatform.profile.proto.IncrementReputationRequest.Builder;
import com.aiplatform.profile.proto.SearchProfilesRequest;
import com.aiplatform.profile.proto.SimpleResponse;
import com.aiplatform.profile.proto.UpdateVisibilityRequest;
import com.aiplatform.profile.proto.UserProfileServiceGrpc;
import io.grpc.Metadata;
import io.grpc.Status;
import io.grpc.StatusRuntimeException;
import io.grpc.stub.MetadataUtils;
import io.jsonwebtoken.Claims;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.devh.boot.grpc.client.inject.GrpcClient;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/internal/profile")
@RequiredArgsConstructor
public class GatewayProfileController {

    private static final Metadata.Key<String> CORRELATION_ID_KEY = Metadata.Key.of("x-correlation-id", Metadata.ASCII_STRING_MARSHALLER);
    private static final Metadata.Key<String> SERVICE_SECRET_KEY = Metadata.Key.of("x-service-secret", Metadata.ASCII_STRING_MARSHALLER);
    private static final Metadata.Key<String> USER_ID_KEY = Metadata.Key.of("x-user-id", Metadata.ASCII_STRING_MARSHALLER);
    private static final Metadata.Key<String> USER_ROLES_KEY = Metadata.Key.of("x-roles", Metadata.ASCII_STRING_MARSHALLER);
    private static final Metadata.Key<String> UNIVERSITY_ID_KEY = Metadata.Key.of("x-university-id", Metadata.ASCII_STRING_MARSHALLER);

    @GrpcClient("profile-service")
    private UserProfileServiceGrpc.UserProfileServiceBlockingStub profileStub;

    private final GrpcProfileProperties grpcProfileProperties;
    private final JwtValidationService jwtValidationService;

    @GetMapping("/me")
    public Mono<ResponseEntity<UserProfileResponse>> getMyProfile(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader
    ) {
        return Mono.fromCallable(() -> {
                    GatewayPrincipal principal = resolvePrincipal(authorization, correlationHeader);
                    var response = withMetadata(principal).getMyProfile(GetMyProfileRequest.newBuilder().build());
                    return ResponseEntity.ok(toDto(response));
                })
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorMap(this::mapGrpcException);
    }

    @GetMapping("/{userId}")
    public Mono<ResponseEntity<UserProfileResponse>> getProfileById(
            @PathVariable String userId,
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader
    ) {
        return Mono.fromCallable(() -> {
                    GatewayPrincipal principal = resolvePrincipal(authorization, correlationHeader);
                    var response = withMetadata(principal)
                            .getProfileById(GetProfileRequest.newBuilder().setUserId(userId).build());
                    return ResponseEntity.ok(toDto(response));
                })
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorMap(this::mapGrpcException);
    }

    @PutMapping("/me")
    public Mono<ResponseEntity<UserProfileResponse>> updateMyProfile(
            @Valid @RequestBody UpdateProfileRequest request,
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader
    ) {
        return Mono.fromCallable(() -> {
                    GatewayPrincipal principal = resolvePrincipal(authorization, correlationHeader);

                    var grpcRequest = com.aiplatform.profile.proto.UpdateProfileRequest.newBuilder();
                    if (request.firstName() != null) {
                        grpcRequest.setFirstName(request.firstName());
                    }
                    if (request.lastName() != null) {
                        grpcRequest.setLastName(request.lastName());
                    }
                    if (request.universityId() != null) {
                        grpcRequest.setUniversityId(request.universityId());
                    }
                    if (request.department() != null) {
                        grpcRequest.setDepartment(request.department());
                    }
                    if (request.bio() != null) {
                        grpcRequest.setBio(request.bio());
                    }
                    if (request.avatarUrl() != null) {
                        grpcRequest.setAvatarUrl(request.avatarUrl());
                    }

                    var response = withMetadata(principal).updateMyProfile(grpcRequest.build());
                    return ResponseEntity.ok(toDto(response));
                })
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorMap(this::mapGrpcException);
    }

    @GetMapping("/search")
    public Mono<ResponseEntity<SearchProfilesResponse>> searchProfiles(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader,
            @RequestParam(required = false) String universityId,
            @RequestParam(required = false) String department,
            @RequestParam(required = false) String nameQuery,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return Mono.fromCallable(() -> {
                    GatewayPrincipal principal = resolvePrincipal(authorization, correlationHeader);
                    SearchProfilesRequest grpcRequest = SearchProfilesRequest.newBuilder()
                            .setUniversityId(defaultString(universityId))
                            .setDepartment(defaultString(department))
                            .setNameQuery(defaultString(nameQuery))
                            .setPage(Math.max(page, 0))
                            .setSize(Math.max(size, 1))
                            .build();

                    var response = withMetadata(principal).searchProfiles(grpcRequest);
                    List<UserProfileResponse> profiles = response.getProfilesList().stream().map(this::toDto).toList();
                    return ResponseEntity.ok(new SearchProfilesResponse(profiles, response.getTotal()));
                })
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorMap(this::mapGrpcException);
    }

    @PatchMapping("/visibility")
    public Mono<ResponseEntity<ApiMessageResponse>> updateVisibility(
            @Valid @RequestBody ProfileVisibilityUpdateRequest request,
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader
    ) {
        return Mono.fromCallable(() -> {
                    GatewayPrincipal principal = resolvePrincipal(authorization, correlationHeader);
                    SimpleResponse response = withMetadata(principal).updateProfileVisibility(
                            UpdateVisibilityRequest.newBuilder().setVisibility(request.visibility()).build()
                    );
                    return ResponseEntity.ok(new ApiMessageResponse(response.getMessage()));
                })
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorMap(this::mapGrpcException);
    }

    @PostMapping("/reputation")
    public Mono<ResponseEntity<ApiMessageResponse>> incrementReputation(
            @Valid @RequestBody IncrementReputationRequest request,
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestHeader(value = "X-Correlation-ID", required = false) String correlationHeader
    ) {
        return Mono.fromCallable(() -> {
                    GatewayPrincipal principal = resolvePrincipal(authorization, correlationHeader);
                    requireAdmin(principal);

                    Builder grpcRequest = com.aiplatform.profile.proto.IncrementReputationRequest.newBuilder()
                            .setUserId(request.userId())
                            .setAmount(request.amount());

                    SimpleResponse response = withMetadata(principal).incrementReputation(grpcRequest.build());
                    return ResponseEntity.ok(new ApiMessageResponse(response.getMessage()));
                })
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorMap(this::mapGrpcException);
    }

    private UserProfileServiceGrpc.UserProfileServiceBlockingStub withMetadata(GatewayPrincipal principal) {
        Metadata metadata = new Metadata();
        metadata.put(CORRELATION_ID_KEY, principal.correlationId());
        metadata.put(SERVICE_SECRET_KEY, grpcProfileProperties.getServiceSecret());
        metadata.put(USER_ID_KEY, principal.userId());
        if (!principal.roles().isBlank()) {
            metadata.put(USER_ROLES_KEY, principal.roles());
        }
        if (!principal.universityId().isBlank()) {
            metadata.put(UNIVERSITY_ID_KEY, principal.universityId());
        }
        return profileStub.withInterceptors(MetadataUtils.newAttachHeadersInterceptor(metadata));
    }

    private GatewayPrincipal resolvePrincipal(String authorization, String correlationHeader) {
        String token = bearerToken(authorization);
        Claims claims = jwtValidationService.parseClaims(token);

        String subject = claims.getSubject();
        if (subject == null || subject.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token subject is missing");
        }

        String correlationId = correlationHeader;
        if (correlationId == null || correlationId.isBlank()) {
            correlationId = UUID.randomUUID().toString();
        }

        String role = claims.get("role", String.class);
        String universityId = Optional.ofNullable(claims.get("universityId", String.class))
                .orElseGet(() -> defaultString(claims.get("university_id", String.class)));

        return new GatewayPrincipal(subject, defaultString(role), defaultString(universityId), correlationId);
    }

    private void requireAdmin(GatewayPrincipal principal) {
        if (!principal.roles().contains("ADMIN")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin role required");
        }
    }

    private String bearerToken(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing bearer token");
        }
        return authorization.substring(7);
    }

    private UserProfileResponse toDto(com.aiplatform.profile.proto.UserProfileResponse response) {
        return new UserProfileResponse(
                response.getUserId(),
                response.getFirstName(),
                response.getLastName(),
                response.getUniversityId(),
                response.getDepartment(),
                response.getBio(),
                response.getAvatarUrl(),
                response.getVisibility(),
                response.getReputationScore(),
                response.getCompletionScore(),
                response.getCreatedAt(),
                response.getUpdatedAt()
        );
    }

    private String defaultString(String value) {
        return value == null ? "" : value;
    }

    private Throwable mapGrpcException(Throwable throwable) {
        if (!(throwable instanceof StatusRuntimeException statusRuntimeException)) {
            return throwable;
        }

        Status.Code code = statusRuntimeException.getStatus().getCode();
        String description = statusRuntimeException.getStatus().getDescription();
        String message = description == null ? "Gateway request failed" : description;

        HttpStatus status = switch (code) {
            case INVALID_ARGUMENT -> HttpStatus.BAD_REQUEST;
            case UNAUTHENTICATED -> HttpStatus.UNAUTHORIZED;
            case PERMISSION_DENIED -> HttpStatus.FORBIDDEN;
            case NOT_FOUND -> HttpStatus.NOT_FOUND;
            case ALREADY_EXISTS -> HttpStatus.CONFLICT;
            case RESOURCE_EXHAUSTED -> HttpStatus.TOO_MANY_REQUESTS;
            default -> HttpStatus.INTERNAL_SERVER_ERROR;
        };

        return new ResponseStatusException(status, message, throwable);
    }

    private record GatewayPrincipal(
            String userId,
            String roles,
            String universityId,
            String correlationId
    ) {
    }
}
