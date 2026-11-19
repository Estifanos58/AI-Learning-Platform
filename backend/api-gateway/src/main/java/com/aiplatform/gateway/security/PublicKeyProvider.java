package com.aiplatform.gateway.security;

import com.aiplatform.gateway.config.GatewayJwtProperties;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.PublicKey;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.X509EncodedKeySpec;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Collections;
import java.util.List;

/**
 * Loads and validates RSA public keys used by the API Gateway to verify JWT signatures.
 * Startup fails explicitly when the primary public key is missing, unreadable, invalid, or weak.
 * Optionally loads a previous public key to support zero-downtime key rotation.
 */
@Slf4j
@Getter
@Component
public class PublicKeyProvider {

    private static final int MIN_RSA_KEY_BITS = 2048;

    private final RSAPublicKey publicKey;
    private final List<RSAPublicKey> verificationKeys;

    public PublicKeyProvider(ResourceLoader resourceLoader, GatewayJwtProperties jwtProperties) {
        this.publicKey = loadAndValidatePublicKey(
                jwtProperties.getPublicKeyPem(),
                jwtProperties.getPublicKeyLocation(),
                resourceLoader,
                "primary JWT public key"
        );

        List<RSAPublicKey> keys = new ArrayList<>();
        keys.add(this.publicKey);

        if (StringUtils.hasText(jwtProperties.getPreviousPublicKeyPem())
                || StringUtils.hasText(jwtProperties.getPreviousPublicKeyLocation())) {
            RSAPublicKey previousKey = loadAndValidatePublicKey(
                    jwtProperties.getPreviousPublicKeyPem(),
                    jwtProperties.getPreviousPublicKeyLocation(),
                    resourceLoader,
                    "previous JWT public key"
            );
            keys.add(previousKey);
            log.info("Loaded previous RSA-{} JWT verification key for key rotation", previousKey.getModulus().bitLength());
        }

        this.verificationKeys = Collections.unmodifiableList(keys);
        log.info("Loaded and validated primary RSA-{} JWT public key", this.publicKey.getModulus().bitLength());
    }

    private RSAPublicKey loadAndValidatePublicKey(
            String inlinePem,
            String location,
            ResourceLoader resourceLoader,
            String label
    ) {
        String pemContent = resolvePemContent(inlinePem, location, resourceLoader, label);
        try {
            String normalized = normalizePem(pemContent);
            byte[] decoded = Base64.getDecoder().decode(normalized);
            PublicKey key = KeyFactory.getInstance("RSA").generatePublic(new X509EncodedKeySpec(decoded));
            if (!(key instanceof RSAPublicKey rsaPublicKey)) {
                throw new IllegalStateException("Configured " + label + " is not an RSA public key");
            }
            if (rsaPublicKey.getModulus().bitLength() < MIN_RSA_KEY_BITS) {
                throw new IllegalStateException("Configured " + label + " must be at least " + MIN_RSA_KEY_BITS + " bits");
            }
            return rsaPublicKey;
        } catch (IllegalStateException ex) {
            throw ex;
        } catch (Exception exception) {
            throw new IllegalStateException("Failed to parse configured " + label + " (X.509 PEM required)", exception);
        }
    }

    private String resolvePemContent(String inlinePem, String location, ResourceLoader resourceLoader, String label) {
        if (StringUtils.hasText(inlinePem)) {
            return inlinePem.replace("\\n", "\n");
        }
        if (!StringUtils.hasText(location)) {
            throw new IllegalStateException(label + " is not configured. Provide PEM content or a valid key file location.");
        }
        Resource resource = resourceLoader.getResource(location);
        if (!resource.exists() || !resource.isReadable()) {
            throw new IllegalStateException(label + " could not be found or read at location: " + location);
        }
        try {
            String content = resource.getContentAsString(StandardCharsets.UTF_8);
            if (!StringUtils.hasText(content)) {
                throw new IllegalStateException(label + " at location is empty: " + location);
            }
            return content;
        } catch (IllegalStateException ex) {
            throw ex;
        } catch (Exception exception) {
            throw new IllegalStateException("Failed to read " + label + " from location: " + location, exception);
        }
    }

    private String normalizePem(String pemContent) {
        String beginMarker = "-----BEGIN PUBLIC KEY-----";
        String endMarker = "-----END PUBLIC KEY-----";
        if (!pemContent.contains(beginMarker) || !pemContent.contains(endMarker)) {
            throw new IllegalStateException("PEM content is missing expected markers: " + beginMarker);
        }
        return pemContent
                .replace(beginMarker, "")
                .replace(endMarker, "")
                .replaceAll("\\s+", "");
    }
}

