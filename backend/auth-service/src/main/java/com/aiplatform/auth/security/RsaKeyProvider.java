package com.aiplatform.auth.security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.SecureRandom;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;

/**
 * Provides RSA keys used by JWT signing and verification.
 * Falls back to deterministic keys when static PEM files cannot be loaded.
 */
@Slf4j
@Component
public class RsaKeyProvider {

    private static final String FALLBACK_KEY_SEED_PREFIX = "aiplatform-dev-jwt-seed:";

    private final PrivateKey privateKey;
    private final PublicKey publicKey;

    public RsaKeyProvider(ResourceLoader resourceLoader, JwtProperties jwtProperties) {
        PrivateKey tempPrivate = null;
        PublicKey tempPublic = null;

        try {
            tempPrivate = loadPrivateKey(resourceLoader.getResource(jwtProperties.getPrivateKeyLocation()));
            tempPublic = loadPublicKey(resourceLoader.getResource(jwtProperties.getPublicKeyLocation()));
        } catch (Exception exception) {
            log.warn("Failed to load RSA keys from resources, generating deterministic fallback keys for runtime", exception);
            KeyPair generatedPair = generateDeterministicKeyPair(jwtProperties.getIssuer());
            tempPrivate = generatedPair.getPrivate();
            tempPublic = generatedPair.getPublic();
        }

        this.privateKey = tempPrivate;
        this.publicKey = tempPublic;
    }

    public PrivateKey getPrivateKey() {
        return privateKey;
    }

    public PublicKey getPublicKey() {
        return publicKey;
    }

    private PrivateKey loadPrivateKey(Resource resource) throws Exception {
        String key = resource.getContentAsString(StandardCharsets.UTF_8)
                .replace("-----BEGIN PRIVATE KEY-----", "")
                .replace("-----END PRIVATE KEY-----", "")
                .replaceAll("\\s", "");
        byte[] decoded = Base64.getDecoder().decode(key);
        return KeyFactory.getInstance("RSA").generatePrivate(new PKCS8EncodedKeySpec(decoded));
    }

    private PublicKey loadPublicKey(Resource resource) throws Exception {
        String key = resource.getContentAsString(StandardCharsets.UTF_8)
                .replace("-----BEGIN PUBLIC KEY-----", "")
                .replace("-----END PUBLIC KEY-----", "")
                .replaceAll("\\s", "");
        byte[] decoded = Base64.getDecoder().decode(key);
        return KeyFactory.getInstance("RSA").generatePublic(new X509EncodedKeySpec(decoded));
    }

    private KeyPair generateDeterministicKeyPair(String issuerSeed) {
        try {
            KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
            SecureRandom secureRandom = SecureRandom.getInstance("SHA1PRNG");
            secureRandom.setSeed((FALLBACK_KEY_SEED_PREFIX + issuerSeed).getBytes(StandardCharsets.UTF_8));
            generator.initialize(2048, secureRandom);
            return generator.generateKeyPair();
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to generate RSA key pair", exception);
        }
    }
}