package com.aiplatform.chat.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.grpc.chat")
public record GrpcChatProperties(String serviceSecret) {
}
