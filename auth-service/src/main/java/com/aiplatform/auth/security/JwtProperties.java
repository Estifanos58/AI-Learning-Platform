package com.aiplatform.auth.security;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Getter
@Setter
@Validated
@ConfigurationProperties(prefix = "app.jwt")
public class JwtProperties {

    @NotBlank
    private String issuer = "ai-learning-platform-auth";

    @NotBlank
    private String audience = "ai-learning-platform-clients";

    @Min(1)
    private long accessTokenExpirationMinutes = 15;

    @Min(1)
    private long refreshTokenExpirationDays = 7;

    @NotBlank
    private String privateKeyLocation = "classpath:keys/private_key.pem";

    @NotBlank
    private String publicKeyLocation = "classpath:keys/public_key.pem";
}