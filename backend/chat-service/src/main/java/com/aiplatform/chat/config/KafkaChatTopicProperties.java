package com.aiplatform.chat.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.kafka.chat")
public record KafkaChatTopicProperties(
        String aiMessageTopic,
        String aiMessageV2Topic,
        String aiMessageChunkTopic,
        String aiMessageCompletedTopic,
        String aiMessageFailedTopic,
        String aiMessageCancelledTopic
) {
}
