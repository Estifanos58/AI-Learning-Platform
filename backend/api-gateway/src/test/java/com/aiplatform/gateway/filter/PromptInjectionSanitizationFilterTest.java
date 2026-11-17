package com.aiplatform.gateway.filter;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.buffer.DefaultDataBufferFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class PromptInjectionSanitizationFilterTest {

    private PromptInjectionSanitizationFilter filter;
    private WebFilterChain chain;

    @BeforeEach
    void setUp() {
        filter = new PromptInjectionSanitizationFilter();
        ReflectionTestUtils.setField(filter, "maxBodyBytes", 1024); // 1 KB for test
        chain = mock(WebFilterChain.class);
        when(chain.filter(org.mockito.ArgumentMatchers.any())).thenReturn(Mono.empty());
    }

    @Test
    @DisplayName("Filter rejects request immediately when Content-Length header exceeds limit")
    void filter_rejectsWhenContentLengthExceedsLimit() {
        MockServerHttpRequest request = MockServerHttpRequest.post("/api/ai/executions")
                .contentType(MediaType.APPLICATION_JSON)
                .header(HttpHeaders.CONTENT_LENGTH, "2048")
                .body("{}");

        MockServerWebExchange exchange = MockServerWebExchange.from(request);

        StepVerifier.create(filter.filter(exchange, chain))
                .verifyComplete();

        assertThat(exchange.getResponse().getStatusCode()).isEqualTo(HttpStatus.PAYLOAD_TOO_LARGE);
    }

    @Test
    @DisplayName("Filter passes valid size JSON payloads to chain")
    void filter_passesValidPayload() {
        byte[] payload = "{\"prompt\": \"Hello AI\"}".getBytes(StandardCharsets.UTF_8);
        MockServerHttpRequest request = MockServerHttpRequest.post("/api/ai/executions")
                .contentType(MediaType.APPLICATION_JSON)
                .header(HttpHeaders.CONTENT_LENGTH, String.valueOf(payload.length))
                .body(new DefaultDataBufferFactory().wrap(payload));

        MockServerWebExchange exchange = MockServerWebExchange.from(request);

        StepVerifier.create(filter.filter(exchange, chain))
                .verifyComplete();

        // Response is not set to error
        assertThat(exchange.getResponse().getStatusCode()).isNull();
    }
}
