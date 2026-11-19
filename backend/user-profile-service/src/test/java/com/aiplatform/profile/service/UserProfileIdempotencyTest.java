package com.aiplatform.profile.service;

import com.aiplatform.profile.domain.UserProfile;
import com.aiplatform.profile.repository.UserProfileRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserProfileIdempotencyTest {

    @Mock
    private UserProfileRepository userProfileRepository;

    @Test
    @DisplayName("Handles concurrent duplicate user.registered event safely via DataIntegrityViolationException")
    void createDefaultProfileIfAbsent_handlesConcurrentDuplicateSafely() {
        UUID userId = UUID.randomUUID();
        when(userProfileRepository.existsByUserId(userId)).thenReturn(false);
        when(userProfileRepository.saveAndFlush(any(UserProfile.class)))
                .thenThrow(new DataIntegrityViolationException("duplicate key value violates unique constraint"));

        UserProfileApplicationService service = new UserProfileApplicationService(userProfileRepository);
        service.createDefaultProfileIfAbsent(userId, "uni-1", "corr-1");

        verify(userProfileRepository).saveAndFlush(any(UserProfile.class));
    }
}
