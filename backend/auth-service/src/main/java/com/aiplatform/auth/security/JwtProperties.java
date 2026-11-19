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

    @NotBlank
    private String keyId = "primary";

    @Min(1)
    private long accessTokenExpirationMinutes = 15;

    @Min(1)
    private long refreshTokenExpirationDays = 7;

    private String privateKeyLocation = "file:/run/secrets/jwt_private_key.pem";

    private String publicKeyLocation = "file:/run/secrets/jwt_public_key.pem";

    private String privateKeyPem;

    private String publicKeyPem;
}
