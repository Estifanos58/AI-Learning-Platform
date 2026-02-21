package com.aiplatform.auth.service;

import com.aiplatform.auth.domain.User;

public interface EmailService {

    void sendVerificationEmail(User user, String token);

    void sendPasswordResetEmail(User user, String token);
}