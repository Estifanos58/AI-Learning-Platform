package com.aiplatform.auth.service;

import com.aiplatform.auth.domain.User;
import com.aiplatform.auth.domain.UserStatus;
import com.aiplatform.auth.dto.RequestMetadata;
import com.aiplatform.auth.dto.SignupRequest;
import com.aiplatform.auth.dto.UserSummaryResponse;
import com.aiplatform.auth.exception.ApiException;
import com.aiplatform.auth.mapper.UserMapper;
import com.aiplatform.auth.proto.Role;
import com.aiplatform.auth.repository.EmailVerificationRepository;
import com.aiplatform.auth.repository.PasswordResetRepository;
import com.aiplatform.auth.repository.RefreshTokenRepository;
import com.aiplatform.auth.repository.UserRepository;
import com.aiplatform.auth.security.JwtProperties;
import com.aiplatform.auth.security.JwtService;
import com.aiplatform.auth.service.event.UserRegisteredEventPublisher;
import com.aiplatform.auth.service.event.VerificationEmailEventPublisher;
import com.aiplatform.auth.util.TokenGeneratorUtil;
import com.aiplatform.auth.util.TokenHashUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceImplTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private EmailVerificationRepository emailVerificationRepository;
    @Mock
    private PasswordResetRepository passwordResetRepository;
    @Mock
    private RefreshTokenRepository refreshTokenRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private TokenHashUtil tokenHashUtil;
    @Mock
    private TokenGeneratorUtil tokenGeneratorUtil;
    @Mock
    private JwtService jwtService;
    @Mock
    private JwtProperties jwtProperties;
    @Mock
    private UserMapper userMapper;
    @Mock
    private UserRegisteredEventPublisher userRegisteredEventPublisher;
    @Mock
    private VerificationEmailEventPublisher verificationEmailEventPublisher;

    @InjectMocks
    private AuthServiceImpl authService;

    private RequestMetadata metadata;

    @BeforeEach
    void setUp() {
        metadata = new RequestMetadata("127.0.0.1", "Mozilla/5.0", "corr-123");
    }

    @Test
    @DisplayName("Public signup MUST always enforce STUDENT role and reject escalation to ADMIN")
    void signup_alwaysEnforcesStudentRole() {
        // Given
        SignupRequest request = new SignupRequest("attacker@example.com", "Attacker", "SecurePass123!");
        when(userRepository.existsByEmailIgnoreCase(any())).thenReturn(false);
        when(userRepository.existsByUsernameIgnoreCase(any())).thenReturn(false);
        when(passwordEncoder.encode(any())).thenReturn("hashed-password");
        when(tokenGeneratorUtil.generateNumericCode(6)).thenReturn("123456");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        authService.signup(request, metadata);

        // Then: capture saved User and verify role is STUDENT
        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        User savedUser = userCaptor.getValue();

        assertThat(savedUser.getRole()).isEqualTo(Role.STUDENT);
        assertThat(savedUser.getStatus()).isEqualTo(UserStatus.PENDING_VERIFICATION);
        assertThat(savedUser.getEmail()).isEqualTo("attacker@example.com");
    }

    @Test
    @DisplayName("updateUserRole updates existing user's role when requested by administrator")
    void updateUserRole_updatesRoleSuccessfully() {
        // Given
        UUID userId = UUID.randomUUID();
        User existingUser = User.builder()
                .id(userId)
                .email("student@example.com")
                .role(Role.STUDENT)
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(existingUser));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(userMapper.toSummary(any(User.class))).thenReturn(
                new UserSummaryResponse(userId, "student@example.com", "student", Role.INSTRUCTOR, UserStatus.ACTIVE, true, LocalDateTime.now())
        );

        // When
        UserSummaryResponse response = authService.updateUserRole(userId, Role.INSTRUCTOR);

        // Then
        assertThat(existingUser.getRole()).isEqualTo(Role.INSTRUCTOR);
        verify(userRepository).save(existingUser);
        assertThat(response.role()).isEqualTo(Role.INSTRUCTOR);
    }

    @Test
    @DisplayName("updateUserRole throws BAD_REQUEST when role is null")
    void updateUserRole_nullRoleThrowsBadRequest() {
        UUID userId = UUID.randomUUID();

        assertThatThrownBy(() -> authService.updateUserRole(userId, null))
                .isInstanceOf(ApiException.class)
                .hasFieldOrPropertyWithValue("status", HttpStatus.BAD_REQUEST);

        verify(userRepository, never()).save(any());
    }
}
