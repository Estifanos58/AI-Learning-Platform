package com.aiplatform.file.config;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "file.storage")
public record FileStorageProperties(
        @NotBlank String rootPath,
        @Positive int maxSizeMb,
        @Positive int chunkSizeBytes
) {
}
