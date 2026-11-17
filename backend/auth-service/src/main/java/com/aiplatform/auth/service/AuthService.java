package com.aiplatform.auth.service;

import com.aiplatform.auth.dto.*;

public interface AuthService {

    SignupResponse signup(SignupRequest request, RequestMetadata metadata);

    ApiMessageResponse verifyEmail(VerifyEmailRequest request);

    ApiMessageResponse resendVerificationCode(RequestMetadata metadata);

    TokenResponse login(LoginRequest request, RequestMetadata metadata);

    TokenResponse refresh(RefreshRequest request, RequestMetadata metadata);

    ApiMessageResponse logout(LogoutRequest request);

    ApiMessageResponse forgotPassword(ForgotPasswordRequest request);

    ApiMessageResponse resetPassword(ResetPasswordRequest request);
}