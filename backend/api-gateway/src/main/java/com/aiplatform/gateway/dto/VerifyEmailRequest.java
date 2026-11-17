package com.aiplatform.gateway.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record VerifyEmailRequest(@NotBlank @Pattern(regexp = "\\d{6}") String code) {
}
