package com.aiplatform.file;

import com.aiplatform.file.config.FileStorageProperties;
import com.aiplatform.file.config.GrpcFileProperties;
import com.aiplatform.file.config.KafkaFileTopicProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties({
        GrpcFileProperties.class,
        FileStorageProperties.class,
        KafkaFileTopicProperties.class
})
public class FileServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(FileServiceApplication.class, args);
    }
}
