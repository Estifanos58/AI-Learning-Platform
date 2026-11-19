package com.aiplatform.auth.security;

import com.aiplatform.auth.domain.User;
import com.aiplatform.auth.domain.UserStatus;
import com.aiplatform.auth.proto.Role;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.security.SecurityException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.core.io.DefaultResourceLoader;

import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.util.Base64;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class RsaKeyProviderTest {

    @TempDir
    Path tempDir;

    @Test
    @DisplayName("Fails startup when RSA key files are missing (no deterministic key fallback)")
    void constructor_failsWhenKeysMissing() {
        JwtProperties props = new JwtProperties();
        props.setPrivateKeyLocation("file:" + tempDir.resolve("nonexistent-private.pem"));
        props.setPublicKeyLocation("file:" + tempDir.resolve("nonexistent-public.pem"));

        assertThatThrownBy(() -> new RsaKeyProvider(new DefaultResourceLoader(), props))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("could not be found");
    }

    @Test
    @DisplayName("Fails startup when RSA key is weaker than 2048 bits")
    void constructor_failsOnWeakKey() throws Exception {
        KeyPair weakPair = generateRsaKeyPair(1024);
        JwtProperties props = new JwtProperties();
        props.setPrivateKeyPem(toPem("PRIVATE KEY", weakPair.getPrivate().getEncoded()));
        props.setPublicKeyPem(toPem("PUBLIC KEY", weakPair.getPublic().getEncoded()));

        assertThatThrownBy(() -> new RsaKeyProvider(new DefaultResourceLoader(), props))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("at least 2048 bits");
    }

    @Test
    @DisplayName("Fails startup when private and public keys do not belong to the same pair")
    void constructor_failsOnMismatchedKeyPair() throws Exception {
        KeyPair pairA = generateRsaKeyPair(2048);
        KeyPair pairB = generateRsaKeyPair(2048);

        JwtProperties props = new JwtProperties();
        props.setPrivateKeyPem(toPem("PRIVATE KEY", pairA.getPrivate().getEncoded()));
        props.setPublicKeyPem(toPem("PUBLIC KEY", pairB.getPublic().getEncoded()));

        assertThatThrownBy(() -> new RsaKeyProvider(new DefaultResourceLoader(), props))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("do not match");
    }

    @Test
    @DisplayName("Loads valid RSA-2048 keys from files and signs/verifies JWT with issuer and audience")
    void constructor_loadsValidKeysFromFilesAndSignsJwt() throws Exception {
        KeyPair keyPair = generateRsaKeyPair(2048);
        Path privFile = tempDir.resolve("private_key.pem");
        Path pubFile = tempDir.resolve("public_key.pem");
        Files.writeString(privFile, toPem("PRIVATE KEY", keyPair.getPrivate().getEncoded()));
        Files.writeString(pubFile, toPem("PUBLIC KEY", keyPair.getPublic().getEncoded()));

        JwtProperties props = new JwtProperties();
        props.setIssuer("test-issuer");
        props.setAudience("test-audience");
        props.setPrivateKeyLocation("file:" + privFile);
        props.setPublicKeyLocation("file:" + pubFile);

        RsaKeyProvider provider = new RsaKeyProvider(new DefaultResourceLoader(), props);
        JwtService jwtService = new JwtService(props, provider);

        User user = User.builder()
                .id(UUID.randomUUID())
                .email("user@example.com")
                .role(Role.STUDENT)
                .status(UserStatus.ACTIVE)
                .build();

        String token = jwtService.generateAccessToken(user);
        Claims claims = jwtService.validateAndExtractClaims(token);

        assertThat(claims.getSubject()).isEqualTo(user.getId().toString());
        assertThat(claims.getIssuer()).isEqualTo("test-issuer");
        assertThat(claims.getAudience()).contains("test-audience");
        assertThat(claims.getId()).isNotBlank();

        // Audience mismatch must fail verification
        JwtProperties wrongAudProps = new JwtProperties();
        wrongAudProps.setIssuer("test-issuer");
        wrongAudProps.setAudience("other-audience");
        wrongAudProps.setPrivateKeyLocation("file:" + privFile);
        wrongAudProps.setPublicKeyLocation("file:" + pubFile);
        JwtService wrongAudService = new JwtService(wrongAudProps, provider);

        assertThatThrownBy(() -> wrongAudService.validateAndExtractClaims(token))
                .isInstanceOf(SecurityException.class);
    }

    private KeyPair generateRsaKeyPair(int bits) throws Exception {
        KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
        generator.initialize(bits);
        return generator.generateKeyPair();
    }

    private String toPem(String type, byte[] encoded) {
        return "-----BEGIN " + type + "-----\n"
                + Base64.getMimeEncoder(64, "\n".getBytes()).encodeToString(encoded)
                + "\n-----END " + type + "-----\n";
    }
}
