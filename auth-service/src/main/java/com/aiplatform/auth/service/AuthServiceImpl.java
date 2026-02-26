package com.aiplatform.auth.service;

import com.aiplatform.auth.domain.*;
import com.aiplatform.auth.dto.*;
import com.aiplatform.auth.exception.ApiException;
import com.aiplatform.auth.mapper.UserMapper;
import com.aiplatform.auth.repository.*;
import com.aiplatform.auth.security.JwtProperties;
import com.aiplatform.auth.security.JwtService;
import com.aiplatform.auth.service.event.UserRegisteredEventPublisher;
import com.aiplatform.auth.util.TokenGeneratorUtil;
import com.aiplatform.auth.util.TokenHashUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Central authentication application service implementing signup, login,
 * token rotation, email verification, and password recovery flows.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final EmailVerificationRepository emailVerificationRepository;
    private final PasswordResetRepository passwordResetRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final TokenHashUtil tokenHashUtil;
    private final TokenGeneratorUtil tokenGeneratorUtil;
    private final JwtService jwtService;
    private final JwtProperties jwtProperties;
    private final UserMapper userMapper;
    private final EmailService emailService;
    private final UserRegisteredEventPublisher userRegisteredEventPublisher;

    @Override
    @Transactional
    public SignupResponse signup(SignupRequest request, RequestMetadata metadata) {
        if (userRepository.existsByEmailIgnoreCase(request.email())) {
            throw new ApiException(HttpStatus.CONFLICT, "Email already exists");
        }
        if (request.username() != null && userRepository.existsByUsernameIgnoreCase(request.username())) {
            throw new ApiException(HttpStatus.CONFLICT, "Username already exists");
        }

        User user = User.builder()
                .email(request.email().trim().toLowerCase())
                .username(request.username())
                .passwordHash(passwordEncoder.encode(request.password()))
                .role(request.role())
                .status(UserStatus.ACTIVE)
                .emailVerified(Boolean.FALSE)
                .build();
        User savedUser = userRepository.save(user);
            userRegisteredEventPublisher.publish(savedUser.getId(), savedUser.getEmail(), null, metadata.correlationId());


        String accessToken = jwtService.generateAccessToken(user);
        String refreshRawToken = tokenGeneratorUtil.generateToken();

        refreshTokenRepository.save(RefreshToken.builder()
                .user(user)
                .tokenHash(tokenHashUtil.sha256(refreshRawToken))
                .expiresAt(LocalDateTime.now().plusDays(jwtProperties.getRefreshTokenExpirationDays()))
                .revoked(Boolean.FALSE)
                .ipAddress(metadata.ipAddress())
                .userAgent(metadata.userAgent())
                .build());



        String rawToken = tokenGeneratorUtil.generateToken();
        emailVerificationRepository.save(EmailVerification.builder()
                .user(savedUser)
                .tokenHash(tokenHashUtil.sha256(rawToken))
                .expiresAt(LocalDateTime.now().plusHours(24))
                .used(Boolean.FALSE)
                .build());

        emailService.sendVerificationEmail(savedUser, rawToken);
        log.info("User signed up successfully. userId={}", savedUser.getId());

        return new SignupResponse("Signup successful. Please verify your email.", accessToken, refreshRawToken, userMapper.toSummary(savedUser));
    }

    @Override
    @Transactional
    public ApiMessageResponse verifyEmail(VerifyEmailRequest request) {
        String tokenHash = tokenHashUtil.sha256(request.token());
        EmailVerification verification = emailVerificationRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Invalid verification token"));

        if (Boolean.TRUE.equals(verification.getUsed()) || verification.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Verification token is expired or already used");
        }

        verification.setUsed(Boolean.TRUE);
        User user = verification.getUser();
        user.setEmailVerified(Boolean.TRUE);

        emailVerificationRepository.save(verification);
        userRepository.save(user);

        return new ApiMessageResponse("Email verified successfully");
    }

    @Override
    @Transactional
    public TokenResponse login(LoginRequest request, RequestMetadata metadata) {

        log.info("Login info from the login service ={} , ={}", request.email(), request.password());

        User user = userRepository.findByEmailIgnoreCase(request.email())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));

//        log.info("Login user Info found ={}",user.getUsername());

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }
//        if (!Boolean.TRUE.equals(user.getEmailVerified())) {
//            throw new ApiException(HttpStatus.FORBIDDEN, "Email is not verified");
//        }
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new ApiException(HttpStatus.FORBIDDEN, "User account is not active");
        }

        String accessToken = jwtService.generateAccessToken(user);
        String refreshRawToken = tokenGeneratorUtil.generateToken();

        refreshTokenRepository.save(RefreshToken.builder()
                .user(user)
                .tokenHash(tokenHashUtil.sha256(refreshRawToken))
                .expiresAt(LocalDateTime.now().plusDays(jwtProperties.getRefreshTokenExpirationDays()))
                .revoked(Boolean.FALSE)
                .ipAddress(metadata.ipAddress())
                .userAgent(metadata.userAgent())
                .build());

        return new TokenResponse(
                accessToken,
                refreshRawToken,
                "Bearer",
                jwtProperties.getAccessTokenExpirationMinutes() * 60
        );
    }

    @Override
    @Transactional(noRollbackFor =  ApiException.class)
    public TokenResponse refresh(RefreshRequest request, RequestMetadata metadata) {
        String tokenHash = tokenHashUtil.sha256(request.refreshToken());
        RefreshToken currentToken = refreshTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Invalid refresh token"));

        if (Boolean.TRUE.equals(currentToken.getRevoked())) {

            log.info("REfresh token used again = {}", currentToken.getReplacedBy());

            UUID replacedBy =  currentToken.getReplacedBy();

            RefreshToken newRefToken = refreshTokenRepository.findById(replacedBy).orElseThrow(() ->
                    new ApiException(HttpStatus.UNAUTHORIZED, "Invalid refresh token"));

            log.info("WE HAVE FOUND it, {}", newRefToken.getId());
            newRefToken.setRevoked(Boolean.TRUE);
            newRefToken.setRevokedAt(LocalDateTime.now());
            refreshTokenRepository.save(newRefToken);
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Refresh token is expired or revoked");
        }

        if(currentToken.getExpiresAt().isBefore((LocalDateTime.now()))){
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Refresh token is Expired");
        }

        User user = currentToken.getUser();
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new ApiException(HttpStatus.FORBIDDEN, "User account is not active");
        }

        String newAccessToken = jwtService.generateAccessToken(user);
        String newRefreshRawToken = tokenGeneratorUtil.generateToken();

        RefreshToken replacementToken = refreshTokenRepository.save(RefreshToken.builder()
                .user(user)
                .tokenHash(tokenHashUtil.sha256(newRefreshRawToken))
                .expiresAt(LocalDateTime.now().plusDays(jwtProperties.getRefreshTokenExpirationDays()))
                .revoked(Boolean.FALSE)
                .ipAddress(metadata.ipAddress())
                .userAgent(metadata.userAgent())
                .build());

        currentToken.setRevoked(Boolean.TRUE);
        currentToken.setRevokedAt(LocalDateTime.now());
        currentToken.setReplacedBy(replacementToken.getId());
        refreshTokenRepository.save(currentToken);

        return new TokenResponse(
                newAccessToken,
                newRefreshRawToken,
                "Bearer",
                jwtProperties.getAccessTokenExpirationMinutes() * 60
        );
    }

    @Override
    @Transactional
    public ApiMessageResponse logout(LogoutRequest request) {
        String tokenHash = tokenHashUtil.sha256(request.refreshToken());
        refreshTokenRepository.findByTokenHash(tokenHash).ifPresent(token -> {
            if (!Boolean.TRUE.equals(token.getRevoked())) {
                token.setRevoked(Boolean.TRUE);
                token.setRevokedAt(LocalDateTime.now());
                refreshTokenRepository.save(token);
            }
        });
        return new ApiMessageResponse("Logout successful");
    }

    @Override
    @Transactional
    public ApiMessageResponse forgotPassword(ForgotPasswordRequest request) {
        userRepository.findByEmailIgnoreCase(request.email()).ifPresent(user -> {
            String resetRawToken = tokenGeneratorUtil.generateToken();
            passwordResetRepository.save(PasswordReset.builder()
                    .user(user)
                    .tokenHash(tokenHashUtil.sha256(resetRawToken))
                    .expiresAt(LocalDateTime.now().plusHours(1))
                    .used(Boolean.FALSE)
                    .build());
            emailService.sendPasswordResetEmail(user, resetRawToken);
        });

        return new ApiMessageResponse("If the email exists, reset instructions were sent");
    }

    @Override
    @Transactional
    public ApiMessageResponse resetPassword(ResetPasswordRequest request) {
        String tokenHash = tokenHashUtil.sha256(request.token());
        PasswordReset passwordReset = passwordResetRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Invalid password reset token"));

        if (Boolean.TRUE.equals(passwordReset.getUsed()) || passwordReset.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Password reset token is expired or already used");
        }

        User user = passwordReset.getUser();
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);

        passwordReset.setUsed(Boolean.TRUE);
        passwordResetRepository.save(passwordReset);

        refreshTokenRepository.findByUserAndRevokedFalseAndExpiresAtAfter(user, LocalDateTime.now())
                .forEach(token -> {
                    token.setRevoked(Boolean.TRUE);
                    token.setRevokedAt(LocalDateTime.now());
                    refreshTokenRepository.save(token);
                });

        return new ApiMessageResponse("Password reset successful");
    }
}