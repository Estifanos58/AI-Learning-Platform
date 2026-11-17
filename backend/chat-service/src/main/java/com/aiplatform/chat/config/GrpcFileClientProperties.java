package com.aiplatform.chat.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.grpc.file")
public record GrpcFileClientProperties(String serviceSecret) {
}
