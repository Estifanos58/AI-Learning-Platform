package com.aiplatform.file.config;

import jakarta.validation.constraints.NotBlank;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.kafka.file-events")
public record KafkaFileTopicProperties(
        boolean enabled,
        @NotBlank String uploadedTopic,
        @NotBlank String deletedTopic,
        @NotBlank String folderCreatedTopic,
        @NotBlank String folderDeletedTopic,
        @NotBlank String folderSharedTopic
) {
}
