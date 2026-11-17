package com.aiplatform.profile.service;

import com.aiplatform.profile.domain.ProfileVisibility;
import com.aiplatform.profile.domain.UserProfile;
import com.aiplatform.profile.exception.ProfileNotFoundException;
import com.aiplatform.profile.exception.UnauthorizedAccessException;
import com.aiplatform.profile.repository.UserProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserProfileApplicationService {

    private final UserProfileRepository userProfileRepository;

    @Transactional(readOnly = true)
    public UserProfile getMyProfile(AuthenticatedPrincipal principal) {
        return userProfileRepository.findByUserIdAndDeletedFalse(principal.userId())
                .orElseThrow(() -> new ProfileNotFoundException("Profile not found"));
    }

    @Transactional(readOnly = true)
    public UserProfile getProfileById(UUID profileUserId, AuthenticatedPrincipal principal) {
        UserProfile target = userProfileRepository.findByUserIdAndDeletedFalse(profileUserId)
                .orElseThrow(() -> new ProfileNotFoundException("Profile not found"));

        if (!canView(target, principal)) {
            throw new UnauthorizedAccessException("Profile is not visible for this user");
        }

        return target;
    }

    @Transactional
    public UserProfile updateMyProfile(AuthenticatedPrincipal principal,
                                       String firstName,
                                       String lastName,
                                       String universityId,
                                       String department,
                                       String bio,
                                       UUID profileImageFileId) {
        UserProfile profile = userProfileRepository.findByUserIdAndDeletedFalse(principal.userId())
                .orElseThrow(() -> new ProfileNotFoundException("Profile not found"));

        profile.setFirstName(emptyToNull(firstName));
        profile.setLastName(emptyToNull(lastName));
        profile.setUniversityId(emptyToNull(universityId));
        profile.setDepartment(emptyToNull(department));
        profile.setBio(bio == null ? "" : bio);
        profile.setProfileImageFileId(profileImageFileId);

        UserProfile saved = userProfileRepository.save(profile);
        log.info("Profile updated. userId={}, correlationId={}", principal.userId(), principal.correlationId());
        return saved;
    }

    @Transactional(readOnly = true)
    public Page<UserProfile> searchProfiles(AuthenticatedPrincipal principal,
                                            String universityId,
                                            String department,
                                            String nameQuery,
                                            int page,
                                            int size) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);

        Page<UserProfile> result = userProfileRepository.search(
                emptyToNull(universityId),
                emptyToNull(department),
                emptyToNull(nameQuery),
                PageRequest.of(safePage, safeSize)
        );

        List<UserProfile> visible = result.getContent().stream()
            .filter(profile -> isNotRequestingUser(profile, principal))
                .filter(profile -> canView(profile, principal))
                .toList();

        return new org.springframework.data.domain.PageImpl<>(visible, result.getPageable(), result.getTotalElements());
    }

    @Transactional
    public void updateVisibility(AuthenticatedPrincipal principal, ProfileVisibility visibility) {
        UserProfile profile = userProfileRepository.findByUserIdAndDeletedFalse(principal.userId())
                .orElseThrow(() -> new ProfileNotFoundException("Profile not found"));
        profile.setProfileVisibility(visibility);
        userProfileRepository.save(profile);
        log.info("Profile visibility updated. userId={}, visibility={}, correlationId={}",
                principal.userId(), visibility, principal.correlationId());
    }

    @Transactional
    public void incrementReputation(UUID userId, int amount, String correlationId) {
        UserProfile profile = userProfileRepository.findByUserIdAndDeletedFalse(userId)
                .orElseThrow(() -> new ProfileNotFoundException("Profile not found"));

        int safeAmount = Math.max(amount, 0);
        profile.setReputationScore(profile.getReputationScore() + safeAmount);
        userProfileRepository.save(profile);
        log.info("Reputation incremented. userId={}, amount={}, correlationId={}", userId, safeAmount, correlationId);
    }

    @Transactional
    public void createDefaultProfileIfAbsent(UUID userId, String universityId, String correlationId) {
        if (userProfileRepository.existsByUserId(userId)) {
            log.info("Skipping profile creation for duplicate event. userId={}, correlationId={}", userId, correlationId);
            return;
        }

        UserProfile profile = UserProfile.builder()
                .userId(userId)
                .firstName(null)
                .lastName(null)
                .universityId(emptyToNull(universityId))
                .department(null)
                .bio("")
                .profileImageFileId(null)
                .profileVisibility(ProfileVisibility.PUBLIC)
                .reputationScore(0)
                .deleted(Boolean.FALSE)
                .build();

        userProfileRepository.save(profile);
        log.info("Default profile created. userId={}, correlationId={}", userId, correlationId);
    }

    public int completionScore(UserProfile profile) {
        int filled = 0;
        if (hasText(profile.getFirstName())) {
            filled++;
        }
        if (hasText(profile.getLastName())) {
            filled++;
        }
        if (hasText(profile.getBio())) {
            filled++;
        }
        if (profile.getProfileImageFileId() != null) {
            filled++;
        }
        if (hasText(profile.getDepartment())) {
            filled++;
        }
        return filled * 20;
    }

    private boolean canView(UserProfile target, AuthenticatedPrincipal principal) {
        if (target.getProfileVisibility() == ProfileVisibility.PUBLIC) {
            return true;
        }

        if (principal == null || principal.userId() == null) {
            return false;
        }

        boolean owner = principal.userId().equals(target.getUserId());

        if (target.getProfileVisibility() == ProfileVisibility.PRIVATE) {
            return owner;
        }

        if (target.getProfileVisibility() == ProfileVisibility.UNIVERSITY_ONLY) {
            return owner || (
                    hasText(target.getUniversityId())
                            && hasText(principal.universityId())
                            && target.getUniversityId().equalsIgnoreCase(principal.universityId())
            );
        }

        return false;
    }

    private boolean isNotRequestingUser(UserProfile target, AuthenticatedPrincipal principal) {
        return principal == null || principal.userId() == null || !principal.userId().equals(target.getUserId());
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private String emptyToNull(String value) {
        return hasText(value) ? value.trim() : null;
    }
}
