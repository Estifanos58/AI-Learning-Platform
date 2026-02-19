package com.aiplatform.auth.service;

import com.aiplatform.auth.dto.*;

public interface AuthService {

    SignupResponse signup(SignupRequest request);

    ApiMessageResponse verifyEmail(VerifyEmailRequest request);

    TokenResponse login(LoginRequest request, RequestMetadata metadata);

    TokenResponse refresh(RefreshRequest request, RequestMetadata metadata);

    ApiMessageResponse logout(LogoutRequest request);

    ApiMessageResponse forgotPassword(ForgotPasswordRequest request);

    ApiMessageResponse resetPassword(ResetPasswordRequest request);
}