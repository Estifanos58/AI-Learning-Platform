package com.aiplatform.gateway.websocket;

import com.aiplatform.chat.proto.ChatServiceGrpc;
import com.aiplatform.gateway.config.GrpcChatProperties;
import com.aiplatform.gateway.security.JwtValidationService;
import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.web.reactive.socket.CloseStatus;
import org.springframework.web.reactive.socket.HandshakeInfo;
import org.springframework.web.reactive.socket.WebSocketSession;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import java.net.URI;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ChatWebSocketHandlerTest {

    @Mock
    private ChatRedisSubscriber redisSubscriber;
    @Mock
    private JwtValidationService jwtValidationService;
    @Mock
    private GrpcChatProperties grpcChatProperties;
    @Mock
    private ChatServiceGrpc.ChatServiceBlockingStub chatStub;
    @Mock
    private WebSocketSession session;
    @Mock
    private HandshakeInfo handshakeInfo;
    @Mock
    private Claims claims;

    private ChatWebSocketHandler handler;

    @BeforeEach
    void setUp() {
        handler = new ChatWebSocketHandler(redisSubscriber, jwtValidationService, grpcChatProperties);
    }

    @Test
    @DisplayName("WebSocket authenticates successfully using Sec-WebSocket-Protocol header")
    void handle_authenticatesViaSecWebSocketProtocol() {
        HttpHeaders headers = new HttpHeaders();
        headers.put("Sec-WebSocket-Protocol", List.of("bearer, valid-jwt-token"));

        when(session.getHandshakeInfo()).thenReturn(handshakeInfo);
        when(handshakeInfo.getUri()).thenReturn(URI.create("ws://localhost:8080/ws/chat"));
        when(handshakeInfo.getHeaders()).thenReturn(headers);

        UUID userId = UUID.randomUUID();
        when(jwtValidationService.parseClaims("valid-jwt-token")).thenReturn(claims);
        when(claims.getSubject()).thenReturn(userId.toString());

        when(redisSubscriber.subscribeToNewChatroom(userId.toString())).thenReturn(Flux.empty());
        when(session.receive()).thenReturn(Flux.empty());
        when(session.send(any())).thenReturn(Mono.empty());

        StepVerifier.create(handler.handle(session))
                .verifyComplete();

        verify(jwtValidationService).parseClaims("valid-jwt-token");
    }

    @Test
    @DisplayName("WebSocket rejects connection when no credentials are provided")
    void handle_rejectsConnectionWhenNoCredentials() {
        HttpHeaders headers = new HttpHeaders();
        when(session.getHandshakeInfo()).thenReturn(handshakeInfo);
        when(handshakeInfo.getUri()).thenReturn(URI.create("ws://localhost:8080/ws/chat"));
        when(handshakeInfo.getHeaders()).thenReturn(headers);
        when(session.close(CloseStatus.POLICY_VIOLATION)).thenReturn(Mono.empty());

        StepVerifier.create(handler.handle(session))
                .verifyComplete();

        verify(session).close(CloseStatus.POLICY_VIOLATION);
    }

    @Test
    @DisplayName("WebSocket authenticates via HttpOnly app_access_token cookie")
    void handle_authenticatesViaHttpOnlyCookie() {
        HttpHeaders headers = new HttpHeaders();
        org.springframework.util.MultiValueMap<String, org.springframework.http.HttpCookie> cookies =
                new org.springframework.util.LinkedMultiValueMap<>();
        cookies.add("app_access_token", new org.springframework.http.HttpCookie("app_access_token", "cookie-jwt-token"));

        when(session.getHandshakeInfo()).thenReturn(handshakeInfo);
        when(handshakeInfo.getUri()).thenReturn(URI.create("ws://localhost:8080/ws/chat"));
        when(handshakeInfo.getHeaders()).thenReturn(headers);
        when(handshakeInfo.getCookies()).thenReturn(cookies);

        UUID userId = UUID.randomUUID();
        when(jwtValidationService.parseClaims("cookie-jwt-token")).thenReturn(claims);
        when(claims.getSubject()).thenReturn(userId.toString());

        when(redisSubscriber.subscribeToNewChatroom(userId.toString())).thenReturn(Flux.empty());
        when(session.receive()).thenReturn(Flux.empty());
        when(session.send(any())).thenReturn(Mono.empty());

        StepVerifier.create(handler.handle(session)).verifyComplete();

        verify(jwtValidationService).parseClaims("cookie-jwt-token");
    }

    @Test
    @DisplayName("WebSocket rejects insecure query parameter token authentication")
    void handle_rejectsQueryParameterToken() {
        HttpHeaders headers = new HttpHeaders();
        when(session.getHandshakeInfo()).thenReturn(handshakeInfo);
        when(handshakeInfo.getUri()).thenReturn(URI.create("ws://localhost:8080/ws/chat?token=leaked-jwt"));
        when(handshakeInfo.getHeaders()).thenReturn(headers);
        when(handshakeInfo.getCookies()).thenReturn(new org.springframework.util.LinkedMultiValueMap<>());
        when(session.close(CloseStatus.POLICY_VIOLATION)).thenReturn(Mono.empty());

        StepVerifier.create(handler.handle(session)).verifyComplete();

        verify(session).close(CloseStatus.POLICY_VIOLATION);
        verify(jwtValidationService, never()).parseClaims(any());
    }
}
