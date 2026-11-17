package com.aiplatform.gateway.config;

import org.springframework.cloud.gateway.filter.ratelimit.KeyResolver;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import reactor.core.publisher.Mono;

import java.net.InetSocketAddress;

@Configuration
public class RateLimitConfig {

    @Bean
    public KeyResolver clientRateLimitKeyResolver() {
        return exchange -> Mono.justOrEmpty(
                        exchange.getRequest().getHeaders().getFirst("X-User-Id")
                )
                .switchIfEmpty(Mono.justOrEmpty(exchange.getRequest().getRemoteAddress())
                        .map(address -> address.getAddress().getHostAddress()))
                .defaultIfEmpty("anonymous");
    }

    @Bean
    @Primary
    public KeyResolver ipRateLimitKeyResolver() {
        return exchange -> {
            String forwardedFor = exchange.getRequest().getHeaders().getFirst("X-Forwarded-For");
            if (forwardedFor != null && !forwardedFor.isBlank()) {
                String firstIp = forwardedFor.split(",")[0].trim();
                if (!firstIp.isBlank()) {
                    return Mono.just(firstIp);
                }
            }

            InetSocketAddress remoteAddress = exchange.getRequest().getRemoteAddress();
            if (remoteAddress != null && remoteAddress.getAddress() != null) {
                return Mono.just(remoteAddress.getAddress().getHostAddress());
            }

            return Mono.just("anonymous");
        };
    }
}
