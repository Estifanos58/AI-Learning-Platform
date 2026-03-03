package com.aiplatform.gateway.config;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Getter
@Setter
@Validated
@ConfigurationProperties(prefix = "app.jwt")
public class GatewayJwtProperties {

    @NotBlank
    private String issuer = "ai-learning-platform-auth";

    @NotBlank
    private String publicKeyLocation = "classpath:keys/public_key.pem";
}
