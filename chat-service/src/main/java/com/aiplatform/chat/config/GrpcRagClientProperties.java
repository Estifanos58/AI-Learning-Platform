package com.aiplatform.chat.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.grpc.rag")
public record GrpcRagClientProperties(String serviceSecret) {
}
