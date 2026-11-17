package com.aiplatform.file.config;

import jakarta.validation.constraints.NotBlank;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.grpc.file")
public record GrpcFileProperties(@NotBlank String serviceSecret) {
}
