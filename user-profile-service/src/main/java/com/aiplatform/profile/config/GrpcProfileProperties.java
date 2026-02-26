package com.aiplatform.profile.config;

import jakarta.validation.constraints.NotBlank;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.grpc.profile")
public record GrpcProfileProperties(@NotBlank String serviceSecret) {
}
