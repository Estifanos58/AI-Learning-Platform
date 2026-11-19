package com.aiplatform.gateway.config;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Getter
@Setter
@Validated
@ConfigurationProperties(prefix = "app.auth.cookie")
public class GatewayAuthCookieProperties {

    @NotBlank
    private String accessTokenName = "app_access_token";

    @NotBlank
    private String refreshTokenName = "app_refresh_token";

    @NotBlank
    private String csrfTokenName = "app_csrf_token";

    private boolean secure = true;

    @NotBlank
    private String sameSite = "Lax";

    @NotBlank
    private String path = "/";

    private String domain = "";

    @Min(60)
    private long refreshTokenMaxAgeSeconds = 604800;

    @Min(60)
    private long defaultAccessTokenMaxAgeSeconds = 900;

    /**
     * When false (default), raw access/refresh tokens are managed strictly via HttpOnly cookies
     * and omitted from JSON auth responses so browser scripts cannot read or persist them.
     */
    private boolean exposeTokensInBody = false;
}
