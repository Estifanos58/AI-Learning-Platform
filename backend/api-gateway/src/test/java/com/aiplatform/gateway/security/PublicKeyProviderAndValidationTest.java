package com.aiplatform.gateway.security;

import com.aiplatform.gateway.config.GatewayJwtProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.core.io.DefaultResourceLoader;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.nio.file.Path;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PublicKeyProviderAndValidationTest {

    @TempDir
    Path tempDir;

    @Test
    @DisplayName("Fails startup when public key is missing (no deterministic fallback)")
    void constructor_failsWhenPublicKeyMissing() {
        GatewayJwtProperties props = new GatewayJwtProperties();
        props.setPublicKeyLocation("file:" + tempDir.resolve("missing.pem"));

        assertThatThrownBy(() -> new PublicKeyProvider(new DefaultResourceLoader(), props))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("could not be found");
    }

    @Test
    @DisplayName("Fails startup when public key is weaker than 2048 bits")
    void constructor_failsOnWeakKey() throws Exception {
        KeyPair weakPair = generateRsaKeyPair(1024);
        GatewayJwtProperties props = new GatewayJwtProperties();
        props.setPublicKeyPem(toPublicPem(weakPair));

        assertThatThrownBy(() -> new PublicKeyProvider(new DefaultResourceLoader(), props))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("at least 2048 bits");
    }

    @Test
    @DisplayName("Supports primary and rotated previous RSA public keys and enforces audience")
    void validation_supportsKeyRotationAndEnforcesAudience() throws Exception {
        KeyPair primaryPair = generateRsaKeyPair(2048);
        KeyPair previousPair = generateRsaKeyPair(2048);

        GatewayJwtProperties props = new GatewayJwtProperties();
        props.setIssuer("test-issuer");
        props.setAudience("test-audience");
        props.setPublicKeyPem(toPublicPem(primaryPair));
        props.setPreviousPublicKeyPem(toPublicPem(previousPair));

        PublicKeyProvider provider = new PublicKeyProvider(new DefaultResourceLoader(), props);
        JwtValidationService service = new JwtValidationService(provider, props);

        String tokenFromPrimary = signToken(primaryPair, "user-1", "test-issuer", "test-audience");
        String tokenFromPrevious = signToken(previousPair, "user-2", "test-issuer", "test-audience");
        String tokenWrongAudience = signToken(primaryPair, "user-3", "test-issuer", "wrong-audience");

        Claims primaryClaims = service.parseClaims(tokenFromPrimary);
        Claims previousClaims = service.parseClaims(tokenFromPrevious);

        assertThat(primaryClaims.getSubject()).isEqualTo("user-1");
        assertThat(previousClaims.getSubject()).isEqualTo("user-2");

        assertThatThrownBy(() -> service.parseClaims(tokenWrongAudience))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    private String signToken(KeyPair pair, String sub, String iss, String aud) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(sub)
                .issuer(iss)
                .audience().add(aud).and()
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(300)))
                .signWith(pair.getPrivate(), Jwts.SIG.RS256)
                .compact();
    }

    private KeyPair generateRsaKeyPair(int bits) throws Exception {
        KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
        generator.initialize(bits);
        return generator.generateKeyPair();
    }

    private String toPublicPem(KeyPair pair) {
        return "-----BEGIN PUBLIC KEY-----\n"
                + Base64.getMimeEncoder(64, "\n".getBytes()).encodeToString(pair.getPublic().getEncoded())
                + "\n-----END PUBLIC KEY-----\n";
    }
}
