package com.aiplatform.chat.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import jakarta.validation.constraints.NotBlank;

@ConfigurationProperties(prefix = "app.grpc.chat")
public record GrpcChatProperties(@NotBlank String serviceSecret) {
}
