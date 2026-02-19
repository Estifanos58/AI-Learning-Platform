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
    private String issuer;

    @NotBlank
    private String audience;

    @Min(1)
    private long accessTokenExpirationMinutes;

    @Min(1)
    private long refreshTokenExpirationDays;

    @NotBlank
    private String privateKeyLocation;

    @NotBlank
    private String publicKeyLocation;
}