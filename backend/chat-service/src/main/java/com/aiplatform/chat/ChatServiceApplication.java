package com.aiplatform.chat;

import com.aiplatform.chat.config.GrpcChatProperties;
import com.aiplatform.chat.config.GrpcFileClientProperties;
import com.aiplatform.chat.config.GrpcRagClientProperties;
import com.aiplatform.chat.config.KafkaChatTopicProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@EnableConfigurationProperties({GrpcChatProperties.class, GrpcFileClientProperties.class, GrpcRagClientProperties.class, KafkaChatTopicProperties.class})
public class ChatServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(ChatServiceApplication.class, args);
    }
}
