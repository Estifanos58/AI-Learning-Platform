package com.aiplatform.gateway.security;

import com.aiplatform.gateway.config.GatewayJwtProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.SignatureException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import java.security.interfaces.RSAPublicKey;
import java.util.List;

@Service
@RequiredArgsConstructor
public class JwtValidationService {

    private final PublicKeyProvider publicKeyProvider;
    private final GatewayJwtProperties jwtProperties;

    public boolean isValid(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (Exception exception) {
            return false;
        }
    }

    public Claims parseClaims(String token) {
        if (!StringUtils.hasText(token)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing bearer token");
        }

        List<RSAPublicKey> keys = publicKeyProvider.getVerificationKeys();
        JwtException lastSignatureException = null;

        for (RSAPublicKey key : keys) {
            try {
                var parserBuilder = Jwts.parser()
                        .verifyWith(key)
                        .requireIssuer(jwtProperties.getIssuer());
                if (StringUtils.hasText(jwtProperties.getAudience())) {
                    parserBuilder.requireAudience(jwtProperties.getAudience());
                }
                return parserBuilder
                        .build()
                        .parseSignedClaims(token)
                        .getPayload();
            } catch (ExpiredJwtException exception) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token expired", exception);
            } catch (SignatureException exception) {
                lastSignatureException = exception;
            } catch (JwtException | IllegalArgumentException exception) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid bearer token", exception);
            }
        }

        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid bearer token", lastSignatureException);
    }
}

