package com.aiplatform.auth.service;

import com.aiplatform.auth.domain.User;
import com.aiplatform.auth.config.AppMailProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailServiceImpl implements EmailService {

    private final JavaMailSender mailSender;
    private final AppMailProperties appMailProperties;

    @Override
    public void sendVerificationEmail(User user, String token) {
        String body = "Verify your email using token: " + token;
        sendOrLog(user.getEmail(), "Verify your account", body);
    }

    @Override
    public void sendPasswordResetEmail(User user, String token) {
        String body = "Reset your password using token: " + token;
        sendOrLog(user.getEmail(), "Reset your password", body);
    }

    private void sendOrLog(String to, String subject, String body) {
        if (!appMailProperties.isEnabled()) {
            log.info("Mail disabled. Mock email to={}, subject={}, body={}", to, subject, body);
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(to);
            message.setFrom(appMailProperties.getFrom());
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
        } catch (Exception exception) {
            log.warn("Failed to send email. Falling back to mock log. to={}, subject={}, body={}", to, subject, body, exception);
        }
    }
}