package com.aiplatform.auth.service;

import com.aiplatform.auth.domain.*;
import com.aiplatform.auth.dto.request.*;
import com.aiplatform.auth.dto.response.*;
import com.aiplatform.auth.exception.AuthException;
import com.aiplatform.auth.exception.TokenException;
import com.aiplatform.auth.repository.*;
import com.aiplatform.auth.util.HashUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.UUID;

@Slf4j
@Service
public class AuthService {

    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final EmailVerificationRepository emailVerificationRepository;
    private final PasswordResetRepository passwordResetRepository;
    private final PasswordEncoder passwordEncoder;
    private final TokenService tokenService;
    private final EmailService emailService;
    private final HashUtil hashUtil;

    public AuthService(UserRepository userRepository,
                       UserProfileRepository userProfileRepository,
                       RefreshTokenRepository refreshTokenRepository,
                       EmailVerificationRepository emailVerificationRepository,
                       PasswordResetRepository passwordResetRepository,
                       PasswordEncoder passwordEncoder,
                       TokenService tokenService,
                       EmailService emailService,
                       HashUtil hashUtil) {
        this.userRepository = userRepository;
        this.userProfileRepository = userProfileRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.emailVerificationRepository = emailVerificationRepository;
        this.passwordResetRepository = passwordResetRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenService = tokenService;
        this.emailService = emailService;
        this.hashUtil = hashUtil;
    }

    @Transactional
    public MessageResponse signup(SignupRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new AuthException("Email already registered");
        }
        if (request.getUsername() != null && userRepository.existsByUsername(request.getUsername())) {
            throw new AuthException("Username already taken");
        }

        User user = User.builder()
                .email(request.getEmail())
                .username(request.getUsername())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(request.getRole() != null ? request.getRole() : User.Role.STUDENT)
                .status(User.UserStatus.ACTIVE)
                .emailVerified(false)
                .build();
        userRepository.save(user);

        UserProfile profile = UserProfile.builder()
                .user(user)
                .build();
        userProfileRepository.save(profile);

        String rawToken = UUID.randomUUID().toString();
        EmailVerification verification = EmailVerification.builder()
                .user(user)
                .tokenHash(hashUtil.hashSHA256(rawToken))
                .expiresAt(LocalDateTime.now().plusHours(24))
                .used(false)
                .build();
        emailVerificationRepository.save(verification);

        emailService.sendVerificationEmail(user.getEmail(), rawToken);

        log.info("User registered: {}", user.getEmail());
        return new MessageResponse("Registration successful. Please check your email to verify your account.");
    }

    @Transactional
    public MessageResponse verifyEmail(VerifyEmailRequest request) {
        String tokenHash = hashUtil.hashSHA256(request.getToken());
        EmailVerification verification = emailVerificationRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new TokenException("Invalid or expired verification token"));

        if (verification.isUsed()) {
            throw new TokenException("Verification token already used");
        }
        if (verification.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new TokenException("Verification token has expired");
        }

        verification.setUsed(true);
        emailVerificationRepository.save(verification);

        User user = verification.getUser();
        user.setEmailVerified(true);
        userRepository.save(user);

        log.info("Email verified for user: {}", user.getEmail());
        return new MessageResponse("Email verified successfully.");
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new AuthException("Invalid credentials"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new AuthException("Invalid credentials");
        }
        if (!user.isEmailVerified()) {
            throw new AuthException("Please verify your email before logging in");
        }
        if (user.getStatus() != User.UserStatus.ACTIVE) {
            throw new AuthException("Account is " + user.getStatus().name().toLowerCase());
        }

        return generateTokenPair(user, null, null);
    }

    @Transactional
    public AuthResponse refresh(RefreshTokenRequest request) {
        String tokenHash = hashUtil.hashSHA256(request.getRefreshToken());
        RefreshToken oldToken = refreshTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new TokenException("Invalid refresh token"));

        if (oldToken.isRevoked()) {
            throw new TokenException("Refresh token has been revoked");
        }
        if (oldToken.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new TokenException("Refresh token has expired");
        }

        User user = oldToken.getUser();

        oldToken.setRevoked(true);
        oldToken.setRevokedAt(LocalDateTime.now());

        String newRawRefreshToken = tokenService.generateRefreshToken();
        String newRefreshTokenHash = hashUtil.hashSHA256(newRawRefreshToken);

        RefreshToken newRefreshToken = RefreshToken.builder()
                .user(user)
                .tokenHash(newRefreshTokenHash)
                .issuedAt(LocalDateTime.now())
                .expiresAt(LocalDateTime.now().plus(Duration.ofMillis(tokenService.getRefreshTokenExpiration())))
                .revoked(false)
                .build();
        refreshTokenRepository.save(newRefreshToken);

        oldToken.setReplacedBy(newRefreshToken.getId());
        refreshTokenRepository.save(oldToken);

        String accessToken = tokenService.generateAccessToken(user);

        log.info("Token refreshed for user: {}", user.getEmail());
        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(newRawRefreshToken)
                .tokenType("Bearer")
                .expiresIn(tokenService.getAccessTokenExpiration() / 1000)
                .build();
    }

    @Transactional
    public MessageResponse logout(LogoutRequest request) {
        String tokenHash = hashUtil.hashSHA256(request.getRefreshToken());
        refreshTokenRepository.findByTokenHash(tokenHash).ifPresent(token -> {
            token.setRevoked(true);
            token.setRevokedAt(LocalDateTime.now());
            refreshTokenRepository.save(token);
        });
        return new MessageResponse("Logged out successfully.");
    }

    @Transactional
    public MessageResponse forgotPassword(ForgotPasswordRequest request) {
        userRepository.findByEmail(request.getEmail()).ifPresent(user -> {
            String rawToken = UUID.randomUUID().toString();
            PasswordReset reset = PasswordReset.builder()
                    .user(user)
                    .tokenHash(hashUtil.hashSHA256(rawToken))
                    .expiresAt(LocalDateTime.now().plusHours(1))
                    .used(false)
                    .build();
            passwordResetRepository.save(reset);
            emailService.sendPasswordResetEmail(user.getEmail(), rawToken);
        });
        return new MessageResponse("If your email is registered, you will receive a password reset email.");
    }

    @Transactional
    public MessageResponse resetPassword(ResetPasswordRequest request) {
        String tokenHash = hashUtil.hashSHA256(request.getToken());
        PasswordReset reset = passwordResetRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new TokenException("Invalid or expired reset token"));

        if (reset.isUsed()) {
            throw new TokenException("Reset token already used");
        }
        if (reset.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new TokenException("Reset token has expired");
        }

        reset.setUsed(true);
        passwordResetRepository.save(reset);

        User user = reset.getUser();
        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        refreshTokenRepository.revokeAllByUser(user);

        log.info("Password reset for user: {}", user.getEmail());
        return new MessageResponse("Password reset successfully. Please login with your new password.");
    }

    private AuthResponse generateTokenPair(User user, String ipAddress, String userAgent) {
        String accessToken = tokenService.generateAccessToken(user);
        String rawRefreshToken = tokenService.generateRefreshToken();

        RefreshToken refreshToken = RefreshToken.builder()
                .user(user)
                .tokenHash(hashUtil.hashSHA256(rawRefreshToken))
                .issuedAt(LocalDateTime.now())
                .expiresAt(LocalDateTime.now().plus(Duration.ofMillis(tokenService.getRefreshTokenExpiration())))
                .revoked(false)
                .ipAddress(ipAddress)
                .userAgent(userAgent)
                .build();
        refreshTokenRepository.save(refreshToken);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(rawRefreshToken)
                .tokenType("Bearer")
                .expiresIn(tokenService.getAccessTokenExpiration() / 1000)
                .build();
    }
}
