package com.aiplatform.auth.security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.Signature;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;

/**
 * Provides validated RSA signing and verification keys for JWT operations.
 * Startup fails explicitly when required keys are missing, invalid, weak, or mismatched.
 */
@Slf4j
@Component
public class RsaKeyProvider {

    private static final int MIN_RSA_KEY_BITS = 2048;

    private final RSAPrivateKey privateKey;
    private final RSAPublicKey publicKey;

    public RsaKeyProvider(ResourceLoader resourceLoader, JwtProperties jwtProperties) {
        this.privateKey = loadAndValidatePrivateKey(resourceLoader, jwtProperties);
        this.publicKey = loadAndValidatePublicKey(resourceLoader, jwtProperties);
        verifyKeyPairIntegrity(this.privateKey, this.publicKey);
        log.info("Loaded and validated RSA-{} JWT key pair (kid={})",
                this.publicKey.getModulus().bitLength(), jwtProperties.getKeyId());
    }

    public PrivateKey getPrivateKey() {
        return privateKey;
    }

    public PublicKey getPublicKey() {
        return publicKey;
    }

    private RSAPrivateKey loadAndValidatePrivateKey(ResourceLoader resourceLoader, JwtProperties jwtProperties) {
        String pemContent = resolvePemContent(
                jwtProperties.getPrivateKeyPem(),
                jwtProperties.getPrivateKeyLocation(),
                resourceLoader,
                "JWT private key"
        );
        try {
            String normalized = normalizePem(pemContent, "PRIVATE KEY");
            byte[] decoded = Base64.getDecoder().decode(normalized);
            PrivateKey key = KeyFactory.getInstance("RSA").generatePrivate(new PKCS8EncodedKeySpec(decoded));
            if (!(key instanceof RSAPrivateKey rsaPrivateKey)) {
                throw new IllegalStateException("Configured JWT private key is not an RSA key");
            }
            if (rsaPrivateKey.getModulus().bitLength() < MIN_RSA_KEY_BITS) {
                throw new IllegalStateException("Configured JWT private key must be at least " + MIN_RSA_KEY_BITS + " bits");
            }
            return rsaPrivateKey;
        } catch (IllegalStateException ex) {
            throw ex;
        } catch (Exception exception) {
            throw new IllegalStateException("Failed to parse configured JWT RSA private key (PKCS#8 PEM required)", exception);
        }
    }

    private RSAPublicKey loadAndValidatePublicKey(ResourceLoader resourceLoader, JwtProperties jwtProperties) {
        String pemContent = resolvePemContent(
                jwtProperties.getPublicKeyPem(),
                jwtProperties.getPublicKeyLocation(),
                resourceLoader,
                "JWT public key"
        );
        try {
            String normalized = normalizePem(pemContent, "PUBLIC KEY");
            byte[] decoded = Base64.getDecoder().decode(normalized);
            PublicKey key = KeyFactory.getInstance("RSA").generatePublic(new X509EncodedKeySpec(decoded));
            if (!(key instanceof RSAPublicKey rsaPublicKey)) {
                throw new IllegalStateException("Configured JWT public key is not an RSA key");
            }
            if (rsaPublicKey.getModulus().bitLength() < MIN_RSA_KEY_BITS) {
                throw new IllegalStateException("Configured JWT public key must be at least " + MIN_RSA_KEY_BITS + " bits");
            }
            return rsaPublicKey;
        } catch (IllegalStateException ex) {
            throw ex;
        } catch (Exception exception) {
            throw new IllegalStateException("Failed to parse configured JWT RSA public key (X.509 PEM required)", exception);
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

    private String normalizePem(String pemContent, String expectedLabel) {
        String beginMarker = "-----BEGIN " + expectedLabel + "-----";
        String endMarker = "-----END " + expectedLabel + "-----";
        if (!pemContent.contains(beginMarker) || !pemContent.contains(endMarker)) {
            throw new IllegalStateException("PEM content is missing expected markers: " + beginMarker);
        }
        return pemContent
                .replace(beginMarker, "")
                .replace(endMarker, "")
                .replaceAll("\\s+", "");
    }

    private void verifyKeyPairIntegrity(RSAPrivateKey privateKey, RSAPublicKey publicKey) {
        if (!privateKey.getModulus().equals(publicKey.getModulus())) {
            throw new IllegalStateException("Configured JWT RSA private and public keys do not match (modulus mismatch)");
        }
        try {
            byte[] challenge = "jwt-key-pair-self-check".getBytes(StandardCharsets.UTF_8);
            Signature signer = Signature.getInstance("SHA256withRSA");
            signer.initSign(privateKey);
            signer.update(challenge);
            byte[] signature = signer.sign();

            Signature verifier = Signature.getInstance("SHA256withRSA");
            verifier.initVerify(publicKey);
            verifier.update(challenge);
            if (!verifier.verify(signature)) {
                throw new IllegalStateException("Configured JWT RSA key pair failed signature verification self-check");
            }
        } catch (IllegalStateException ex) {
            throw ex;
        } catch (Exception exception) {
            throw new IllegalStateException("Failed to verify JWT RSA key pair integrity", exception);
        }
    }
}
