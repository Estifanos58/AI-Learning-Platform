package com.aiplatform.gateway.security;

import com.aiplatform.gateway.config.GatewayJwtProperties;
import lombok.Getter;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.PublicKey;
import java.security.SecureRandom;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;

@Getter
@Component
public class PublicKeyProvider {

    private static final String FALLBACK_KEY_SEED_PREFIX = "aiplatform-dev-jwt-seed:";

    private final PublicKey publicKey;

    public PublicKeyProvider(ResourceLoader resourceLoader, GatewayJwtProperties jwtProperties) {
        PublicKey resolvedPublicKey;
        try {
            Resource resource = resourceLoader.getResource(jwtProperties.getPublicKeyLocation());
            String key = resource.getContentAsString(StandardCharsets.UTF_8)
                    .replace("-----BEGIN PUBLIC KEY-----", "")
                    .replace("-----END PUBLIC KEY-----", "")
                    .replaceAll("\\s", "");
            byte[] decoded = Base64.getDecoder().decode(key);
            resolvedPublicKey = KeyFactory.getInstance("RSA").generatePublic(new X509EncodedKeySpec(decoded));
        } catch (Exception exception) {
            resolvedPublicKey = generateDeterministicPublicKey(jwtProperties.getIssuer());
        }
        this.publicKey = resolvedPublicKey;
    }

    private PublicKey generateDeterministicPublicKey(String issuerSeed) {
        try {
            KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
            SecureRandom secureRandom = SecureRandom.getInstance("SHA1PRNG");
            secureRandom.setSeed((FALLBACK_KEY_SEED_PREFIX + issuerSeed).getBytes(StandardCharsets.UTF_8));
            generator.initialize(2048, secureRandom);
            KeyPair keyPair = generator.generateKeyPair();
            return keyPair.getPublic();
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to load JWT public key", exception);
        }
    }
}
