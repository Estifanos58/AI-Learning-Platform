package com.aiplatform.gateway.websocket;

import com.aiplatform.gateway.security.JwtValidationService;
import com.aiplatform.gateway.util.GatewayRequestUtils;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.socket.WebSocketHandler;
import org.springframework.web.reactive.socket.WebSocketMessage;
import org.springframework.web.reactive.socket.WebSocketSession;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;

/**
 * Reactive WebSocket handler for chat real-time events.
 *
 * <p>Connection URL: {@code /ws/chat?token=<jwt>&chatroomId=<id>}
 *
 * <p>Optional query param {@code userId} subscribes to new chatroom notifications
 * (the server auto-derives userId from the JWT subject if not provided).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ChatWebSocketHandler implements WebSocketHandler {

    private final ChatRedisSubscriber redisSubscriber;
    private final JwtValidationService jwtValidationService;

    @Override
    public Mono<Void> handle(WebSocketSession session) {
        Map<String, String> params = extractQueryParams(session.getHandshakeInfo().getUri().getQuery());

        String token = params.get("token");
        String chatroomId = params.get("chatroomId");

        // Authenticate the connecting user via JWT
        String userId;
        try {
            Claims claims = jwtValidationService.parseClaims(GatewayRequestUtils.bearerToken("Bearer " + token));
            userId = claims.getSubject();
        } catch (Exception e) {
            log.warn("WebSocket authentication failed: {}", e.getMessage());
            return session.close();
        }

        if (userId == null || userId.isBlank()) {
            log.warn("WebSocket connection rejected: missing userId in token");
            return session.close();
        }

        final String finalUserId = userId;

        // Build the outbound event stream from Redis subscriptions
        Flux<String> eventFlux = buildEventFlux(chatroomId, finalUserId);

        Flux<WebSocketMessage> outbound = eventFlux
                .map(session::textMessage)
                .doOnSubscribe(s -> log.info("WebSocket session started. sessionId={}, userId={}, chatroomId={}", session.getId(), finalUserId, chatroomId))
                .doOnTerminate(() -> log.info("WebSocket session ended. sessionId={}, userId={}", session.getId(), finalUserId));

        // Consume any incoming messages from client (echo/discard)
        Mono<Void> inbound = session.receive()
                .doOnNext(msg -> log.debug("WS inbound from userId={}: {}", finalUserId, msg.getPayloadAsText()))
                .then();

        return Mono.zip(session.send(outbound), inbound).then();
    }

    private Flux<String> buildEventFlux(String chatroomId, String userId) {
        Flux<String> newChatroomFlux = redisSubscriber.subscribeToNewChatroom(userId);

        if (chatroomId != null && !chatroomId.isBlank()) {
            return Flux.merge(
                    redisSubscriber.subscribeToNewMessages(chatroomId),
                    redisSubscriber.subscribeToTyping(chatroomId),
                    newChatroomFlux
            );
        }
        return newChatroomFlux;
    }

    private Map<String, String> extractQueryParams(String query) {
        if (query == null || query.isBlank()) {
            return Map.of();
        }
        java.util.Map<String, String> result = new java.util.HashMap<>();
        for (String part : query.split("&")) {
            String[] kv = part.split("=", 2);
            if (kv.length == 2) {
                result.put(kv[0], kv[1]);
            }
        }
        return result;
    }
}
