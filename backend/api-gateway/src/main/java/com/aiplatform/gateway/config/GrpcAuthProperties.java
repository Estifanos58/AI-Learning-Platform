package com.aiplatform.gateway.config;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Getter
@Setter
@Validated
@ConfigurationProperties(prefix = "app.grpc.auth")
public class GrpcAuthProperties {

    @NotBlank
    private String serviceSecret;
}
