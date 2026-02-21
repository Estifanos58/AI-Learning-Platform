package com.aiplatform.auth.controller;

import com.aiplatform.auth.dto.*;
import com.aiplatform.auth.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/signup")
    public ResponseEntity<SignupResponse> signup(@Valid @RequestBody SignupRequest request) {
        return ResponseEntity.ok(authService.signup(request));
    }

    @PostMapping("/verify-email")
    public ResponseEntity<ApiMessageResponse> verifyEmail(@Valid @RequestBody VerifyEmailRequest request) {
        return ResponseEntity.ok(authService.verifyEmail(request));
    }

    @PostMapping("/login")
    public ResponseEntity<TokenResponse> login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpServletRequest) {
        return ResponseEntity.ok(authService.login(request, toMetadata(httpServletRequest)));
    }

    @PostMapping("/refresh")
    public ResponseEntity<TokenResponse> refresh(@Valid @RequestBody RefreshRequest request, HttpServletRequest httpServletRequest) {
        return ResponseEntity.ok(authService.refresh(request, toMetadata(httpServletRequest)));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiMessageResponse> logout(@Valid @RequestBody LogoutRequest request) {
        return ResponseEntity.ok(authService.logout(request));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<ApiMessageResponse> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        return ResponseEntity.ok(authService.forgotPassword(request));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ApiMessageResponse> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        return ResponseEntity.ok(authService.resetPassword(request));
    }

    @GetMapping("/health")
    public ResponseEntity<ApiMessageResponse> health() {
        return ResponseEntity.ok(new ApiMessageResponse("UP"));
    }

    private RequestMetadata toMetadata(HttpServletRequest request) {
        return new RequestMetadata(request.getRemoteAddr(), request.getHeader("User-Agent"));
    }
}