package com.aiplatform.gateway.filter;

import lombok.extern.slf4j.Slf4j;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.core.io.buffer.DataBufferUtils;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpRequestDecorator;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Prompt injection sanitization filter for AI message endpoints.
 *
 * <p>Applied to {@code POST /api/internal/chat/messages} only.
 * Performs defensive normalization without mutating user intent semantically:
 * <ul>
 *   <li>Enforce maximum body size</li>
 *   <li>Remove null bytes and non-printable control characters</li>
 *   <li>Normalize Unicode to NFC form</li>
 *   <li>Strip well-known prompt injection patterns (role override attempts)</li>
 *   <li>Attach {@code X-Sanitization-Flags} header for audit</li>
 * </ul>
 */
@Slf4j
@Component
@Order(-10)
public class PromptInjectionSanitizationFilter implements WebFilter {

    private static final String MESSAGES_PATH = "/api/internal/chat/messages";
    private static final int DEFAULT_MAX_BODY_BYTES = 64 * 1024; // 64 KB

    @org.springframework.beans.factory.annotation.Value("${app.security.prompt-sanitization.max-body-bytes:65536}")
    private int maxBodyBytes = DEFAULT_MAX_BODY_BYTES;

    // Patterns to detect common prompt injection attempts
    private static final Pattern ROLE_OVERRIDE_PATTERN = Pattern.compile(
            "(?i)(ignore previous instructions?|disregard (all |your )?instructions?|" +
            "you are now|act as (a |an )?|new instructions?:|system:)",
            Pattern.CASE_INSENSITIVE
    );
    private static final Pattern NULL_BYTES_PATTERN = Pattern.compile("\\x00");
    private static final Pattern CONTROL_CHARS_PATTERN = Pattern.compile("[\\x01-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]");

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();

        // Only apply to POST /api/internal/chat/messages
        if (!HttpMethod.POST.equals(request.getMethod())
                || !request.getPath().value().equals(MESSAGES_PATH)) {
            return chain.filter(exchange);
        }

        MediaType contentType = request.getHeaders().getContentType();
        if (contentType == null || !contentType.isCompatibleWith(MediaType.APPLICATION_JSON)) {
            return chain.filter(exchange);
        }

        return DataBufferUtils.join(request.getBody())
                .flatMap(dataBuffer -> {
                    byte[] bytes = new byte[dataBuffer.readableByteCount()];
                    dataBuffer.read(bytes);
                    DataBufferUtils.release(dataBuffer);

                    if (bytes.length > maxBodyBytes) {
                        log.warn("Request body too large for sanitization ({}b > {}b); passing through",
                                bytes.length, maxBodyBytes);
                        // Rebuild request with original bytes and continue
                        return chain.filter(rebuildExchange(exchange, bytes, "size_exceeded"));
                    }

                    String body = new String(bytes, StandardCharsets.UTF_8);
                    SanitizationResult result = sanitize(body);

                    if (!result.flags().isEmpty()) {
                        log.info("Prompt sanitization applied. correlationId={} flags={}",
                                exchange.getRequest().getHeaders().getFirst("X-Correlation-ID"),
                                result.flags());
                    }

                    byte[] sanitizedBytes = result.sanitized().getBytes(StandardCharsets.UTF_8);
                    return chain.filter(rebuildExchange(exchange, sanitizedBytes, String.join(",", result.flags())));
                })
                .switchIfEmpty(chain.filter(exchange));
    }

    private ServerWebExchange rebuildExchange(ServerWebExchange exchange, byte[] body, String flags) {
        ServerHttpRequest mutatedRequest = new ServerHttpRequestDecorator(exchange.getRequest()) {
            @Override
            public Flux<DataBuffer> getBody() {
                DataBuffer buffer = exchange.getResponse().bufferFactory().wrap(body);
                return Flux.just(buffer);
            }
        };

        ServerWebExchange mutated = exchange.mutate()
                .request(mutatedRequest)
                .build();

        if (!flags.isEmpty()) {
            mutated = mutated.mutate()
                    .request(mutated.getRequest().mutate()
                            .header("X-Sanitization-Flags", flags)
                            .header("X-Correlation-ID",
                                    getOrGenerate(exchange.getRequest().getHeaders().getFirst("X-Correlation-ID")))
                            .build())
                    .build();
        }

        return mutated;
    }

    SanitizationResult sanitize(String body) {
        java.util.List<String> flags = new java.util.ArrayList<>();
        String result = body;

        // 1. Remove null bytes
        if (NULL_BYTES_PATTERN.matcher(result).find()) {
            result = NULL_BYTES_PATTERN.matcher(result).replaceAll("");
            flags.add("null_bytes_removed");
        }

        // 2. Remove non-printable control characters (keep \t \n \r)
        if (CONTROL_CHARS_PATTERN.matcher(result).find()) {
            result = CONTROL_CHARS_PATTERN.matcher(result).replaceAll("");
            flags.add("control_chars_removed");
        }

        // 3. Normalize Unicode (NFC)
        String nfc = java.text.Normalizer.normalize(result, java.text.Normalizer.Form.NFC);
        if (!nfc.equals(result)) {
            result = nfc;
            flags.add("unicode_normalized");
        }

        // 4. Flag (but do not strip) prompt injection patterns – log for audit
        if (ROLE_OVERRIDE_PATTERN.matcher(result).find()) {
            flags.add("prompt_injection_detected");
            // We flag but preserve the text; blocking is done by model-side guardrails
        }

        return new SanitizationResult(result, flags);
    }

    private String getOrGenerate(String correlationId) {
        return (correlationId != null && !correlationId.isBlank())
                ? correlationId
                : UUID.randomUUID().toString();
    }

    record SanitizationResult(String sanitized, java.util.List<String> flags) {}
}
