package com.aiplatform.auth.dto;

import com.aiplatform.auth.domain.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record SignupRequest(
        @NotBlank @Email String email,
        @NotBlank @Size(max = 100) String username,
        @NotBlank @Size(min = 8, max = 128) String password,
        @NotNull Role role
) {
}