package com.aiplatform.auth.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "jwt")
@Getter
@Setter
public class JwtProperties {
    private String privateKeyPath;
    private String publicKeyPath;
    private long accessTokenExpiration;
    private long refreshTokenExpiration;
    private String issuer;
    private String audience;
}
