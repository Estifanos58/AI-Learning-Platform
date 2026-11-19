package com.aiplatform.gateway.filter;

import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

import java.util.UUID;

/**
 * Ensures every request carries an X-Correlation-ID header and echoes it back in responses.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class CorrelationIdWebFilter implements WebFilter {

    public static final String CORRELATION_ID_HEADER = "X-Correlation-ID";

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        String existing = exchange.getRequest().getHeaders().getFirst(CORRELATION_ID_HEADER);
        String correlationId = StringUtils.hasText(existing) ? existing.trim() : UUID.randomUUID().toString();

        exchange.getResponse().getHeaders().set(CORRELATION_ID_HEADER, correlationId);

        ServerWebExchange mutatedExchange = exchange;
        if (!StringUtils.hasText(existing)) {
            ServerHttpRequest mutatedRequest = exchange.getRequest().mutate()
                    .header(CORRELATION_ID_HEADER, correlationId)
                    .build();
            mutatedExchange = exchange.mutate().request(mutatedRequest).build();
        }

        return chain.filter(mutatedExchange)
                .contextWrite(ctx -> ctx.put("correlationId", correlationId));
    }
}
