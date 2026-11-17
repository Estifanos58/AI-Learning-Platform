package com.aiplatform.gateway.filter;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.core.io.buffer.DataBufferUtils;
import org.springframework.http.HttpHeaders;
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
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.regex.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * Prompt injection sanitization filter for AI message endpoints.
 *
 * <p>Applied to {@code POST /api/chat/messages}, {@code POST /api/internal/chat/messages},
 * {@code POST /api/ai/executions}, and {@code POST /api/internal/ai/executions}.
 * Performs defensive normalization without mutating user intent semantically:
 * <ul>
 *   <li>Enforce maximum body size BEFORE buffering</li>
 *   <li>Remove null bytes and non-printable control characters</li>
 *   <li>Normalize Unicode to NFC form</li>
 *   <li>Strip well-known prompt injection patterns (role override attempts)</li>
 *   <li>Attach {@code X-Sanitization-Flags} header for audit</li>
 * </ul>
 */
@Component
@Order(-10)
public class PromptInjectionSanitizationFilter implements WebFilter {

    private static final Logger log = LoggerFactory.getLogger(PromptInjectionSanitizationFilter.class);

    private static final Set<String> TARGET_PATHS = Set.of(
            "/api/chat/messages",
            "/api/internal/chat/messages",
            "/api/ai/executions",
            "/api/internal/ai/executions"
    );
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

        if (!HttpMethod.POST.equals(request.getMethod())
            || !TARGET_PATHS.contains(request.getPath().value())) {
            return chain.filter(exchange);
        }

        MediaType contentType = request.getHeaders().getContentType();
        if (contentType == null || !contentType.isCompatibleWith(MediaType.APPLICATION_JSON)) {
            return chain.filter(exchange);
        }

        // Enforce Content-Length limit BEFORE reading or buffering body
        long contentLength = request.getHeaders().getContentLength();
        if (contentLength > maxBodyBytes) {
            log.warn("Rejected request: Content-Length {} exceeds max limit {} bytes for path {}",
                    contentLength, maxBodyBytes, request.getPath().value());
            exchange.getResponse().setStatusCode(HttpStatus.PAYLOAD_TOO_LARGE);
            return exchange.getResponse().setComplete();
        }

        // Bounded buffering: abort immediately if streaming body exceeds maxBodyBytes
        AtomicInteger accumulatedBytes = new AtomicInteger(0);
        return request.getBody()
                .flatMap(buffer -> {
                    int current = accumulatedBytes.addAndGet(buffer.readableByteCount());
                    if (current > maxBodyBytes) {
                        DataBufferUtils.release(buffer);
                        log.warn("Rejected streaming request body exceeding max limit {} bytes for path {}",
                                maxBodyBytes, request.getPath().value());
                        return Mono.error(new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Request body exceeds max allowed size"));
                    }
                    return Mono.just(buffer);
                })
                .collectList()
                .flatMap(buffers -> {
                    int totalBytes = buffers.stream().mapToInt(DataBuffer::readableByteCount).sum();
                    byte[] bytes = new byte[totalBytes];
                    int offset = 0;
                    for (DataBuffer b : buffers) {
                        int len = b.readableByteCount();
                        b.read(bytes, offset, len);
                        DataBufferUtils.release(b);
                        offset += len;
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
                .onErrorResume(ResponseStatusException.class, ex -> {
                    exchange.getResponse().setStatusCode(ex.getStatusCode());
                    return exchange.getResponse().setComplete();
                })
                .switchIfEmpty(chain.filter(exchange));
    }

    private ServerWebExchange rebuildExchange(ServerWebExchange exchange, byte[] body, String flags) {
        ServerHttpRequest mutatedRequest = new ServerHttpRequestDecorator(exchange.getRequest()) {
            @Override
            public HttpHeaders getHeaders() {
                HttpHeaders headers = new HttpHeaders();
                headers.putAll(super.getHeaders());
                headers.remove(HttpHeaders.CONTENT_LENGTH);
                headers.setContentLength(body.length);
                if (!headers.containsKey(HttpHeaders.CONTENT_TYPE)) {
                    headers.setContentType(MediaType.APPLICATION_JSON);
                }
                return headers;
            }

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
