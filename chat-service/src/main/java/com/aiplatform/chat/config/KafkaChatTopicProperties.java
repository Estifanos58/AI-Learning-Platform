package com.aiplatform.chat.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import jakarta.validation.constraints.NotBlank;

@ConfigurationProperties(prefix = "app.kafka.chat")
public record KafkaChatTopicProperties(
        @NotBlank String aiRequestedTopic
) {
}
