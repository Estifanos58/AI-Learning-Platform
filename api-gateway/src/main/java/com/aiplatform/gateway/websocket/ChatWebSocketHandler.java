package com.aiplatform.gateway.websocket;

import com.aiplatform.chat.proto.ChatServiceGrpc;
import com.aiplatform.chat.proto.GetChatroomRequest;
import com.aiplatform.gateway.config.GrpcChatProperties;
import com.aiplatform.gateway.security.JwtValidationService;
import io.jsonwebtoken.Claims;
import io.grpc.Metadata;
import io.grpc.stub.MetadataUtils;
import net.devh.boot.grpc.client.inject.GrpcClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.util.MultiValueMap;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.UriComponentsBuilder;
import org.springframework.web.reactive.socket.CloseStatus;
import org.springframework.web.reactive.socket.WebSocketHandler;
import org.springframework.web.reactive.socket.WebSocketMessage;
import org.springframework.web.reactive.socket.WebSocketSession;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.netty.channel.AbortedException;
import reactor.core.scheduler.Schedulers;

import java.util.UUID;

/**
 * Reactive WebSocket handler for chat real-time events.
 *
 * <p>Connection URL: {@code /ws/chat?token=<jwt>&chatroomId=<id>}
 *
 * <p>Optional query param {@code userId} subscribes to new chatroom notifications
 * (the server auto-derives userId from the JWT subject if not provided).
 */
@Component
public class ChatWebSocketHandler implements WebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(ChatWebSocketHandler.class);

    private static final Metadata.Key<String> CORRELATION_ID_KEY = Metadata.Key.of("x-correlation-id", Metadata.ASCII_STRING_MARSHALLER);
    private static final Metadata.Key<String> SERVICE_SECRET_KEY = Metadata.Key.of("x-service-secret", Metadata.ASCII_STRING_MARSHALLER);
    private static final Metadata.Key<String> USER_ID_KEY = Metadata.Key.of("x-user-id", Metadata.ASCII_STRING_MARSHALLER);

    private final ChatRedisSubscriber redisSubscriber;
    private final JwtValidationService jwtValidationService;
    private final GrpcChatProperties grpcChatProperties;

    public ChatWebSocketHandler(
            ChatRedisSubscriber redisSubscriber,
            JwtValidationService jwtValidationService,
            GrpcChatProperties grpcChatProperties
    ) {
        this.redisSubscriber = redisSubscriber;
        this.jwtValidationService = jwtValidationService;
        this.grpcChatProperties = grpcChatProperties;
    }

    @GrpcClient("chat-service")
    private ChatServiceGrpc.ChatServiceBlockingStub chatStub;

    @Override
    public Mono<Void> handle(WebSocketSession session) {
        return Mono.fromCallable(() -> authenticateAndAuthorize(session))
                .subscribeOn(Schedulers.boundedElastic())
                .flatMap(context -> {
                    Flux<String> eventFlux = buildEventFlux(context.chatroomId(), context.userId());

                    Flux<WebSocketMessage> outbound = eventFlux
                            .map(session::textMessage)
                            .doOnSubscribe(s -> log.info("WebSocket session started. sessionId={}, userId={}, chatroomId={}", session.getId(), context.userId(), context.chatroomId()))
                            .doOnTerminate(() -> log.info("WebSocket session ended. sessionId={}, userId={}", session.getId(), context.userId()));

                    Mono<Void> inbound = session.receive()
                            .doOnNext(msg -> log.debug("WS inbound from userId={}: {}", context.userId(), msg.getPayloadAsText()))
                            .then();

                    return session.send(outbound).and(inbound);
                })
                .onErrorResume(ResponseStatusException.class, ex -> {
                    log.warn("WebSocket connection rejected: status={}, reason={}", ex.getStatusCode(), ex.getReason());
                    return session.close(CloseStatus.POLICY_VIOLATION);
                })
                .onErrorResume(AbortedException.class, ex -> {
                    log.debug("WebSocket connection closed by client. sessionId={}", session.getId());
                    return Mono.empty();
                })
                .onErrorResume(ex -> {
                    log.warn("Unexpected WebSocket error", ex);
                    return session.close(CloseStatus.SERVER_ERROR);
                });
    }

    private Flux<String> buildEventFlux(String chatroomId, String userId) {
        Flux<String> newChatroomFlux = redisSubscriber.subscribeToNewChatroom(userId);

        if (chatroomId != null && !chatroomId.isBlank()) {
            return Flux.merge(
                    redisSubscriber.subscribeToNewMessages(chatroomId),
                    redisSubscriber.subscribeToTyping(chatroomId),
                    redisSubscriber.subscribeToAiEvents(chatroomId),
                    newChatroomFlux
            );
        }
        return newChatroomFlux;
    }

    private ConnectionContext authenticateAndAuthorize(WebSocketSession session) {
        MultiValueMap<String, String> params = UriComponentsBuilder
                .fromUri(session.getHandshakeInfo().getUri())
                .build()
                .getQueryParams();

        String token = resolveToken(
                params.getFirst("token"),
                session.getHandshakeInfo().getHeaders().getFirst(HttpHeaders.AUTHORIZATION)
        );

        Claims claims = jwtValidationService.parseClaims(token);
        String userId = claims.getSubject();
        if (!StringUtils.hasText(userId)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token subject is missing");
        }

        String chatroomId = params.getFirst("chatroomId");
        if (StringUtils.hasText(chatroomId)) {
            ensureChatroomAccess(chatroomId, userId);
        }

        return new ConnectionContext(userId, chatroomId);
    }

    private String resolveToken(String tokenFromQuery, String authorizationHeader) {
        if (StringUtils.hasText(authorizationHeader) && authorizationHeader.startsWith("Bearer ")) {
            return authorizationHeader.substring(7);
        }

        if (StringUtils.hasText(tokenFromQuery)) {
            if (tokenFromQuery.startsWith("Bearer ")) {
                return tokenFromQuery.substring(7);
            }
            return tokenFromQuery;
        }

        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing bearer token");
    }

    private void ensureChatroomAccess(String chatroomId, String userId) {
        Metadata metadata = new Metadata();
        metadata.put(CORRELATION_ID_KEY, UUID.randomUUID().toString());
        metadata.put(SERVICE_SECRET_KEY, grpcChatProperties.getServiceSecret());
        metadata.put(USER_ID_KEY, userId);

        try {
            chatStub.withInterceptors(MetadataUtils.newAttachHeadersInterceptor(metadata))
                    .getChatroom(GetChatroomRequest.newBuilder().setChatroomId(chatroomId).build());
        } catch (Exception exception) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "User is not allowed to subscribe to this chatroom", exception);
        }
    }

    private record ConnectionContext(String userId, String chatroomId) {
    }
}
