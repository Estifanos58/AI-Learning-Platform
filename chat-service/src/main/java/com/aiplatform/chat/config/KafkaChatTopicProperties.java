package com.aiplatform.chat.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.kafka.chat")
public record KafkaChatTopicProperties(String aiMessageTopic) {
}
