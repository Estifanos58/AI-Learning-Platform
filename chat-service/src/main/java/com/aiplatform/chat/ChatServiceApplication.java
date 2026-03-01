package com.aiplatform.chat;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

import com.aiplatform.chat.config.GrpcChatProperties;
import com.aiplatform.chat.config.KafkaChatTopicProperties;

@SpringBootApplication
@EnableConfigurationProperties({
        GrpcChatProperties.class,
        KafkaChatTopicProperties.class
})
public class ChatServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(ChatServiceApplication.class, args);
    }
}
