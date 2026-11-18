package com.aiplatform.gateway.controller;

import com.aiplatform.gateway.config.GrpcRagProperties;
import com.aiplatform.gateway.dto.StartAiExecutionRequest;
import com.aiplatform.gateway.dto.StartAiExecutionResponse;
import com.aiplatform.gateway.security.JwtValidationService;
import com.aiplatform.rag.proto.ExecuteAcceptedResponse;
import com.aiplatform.rag.proto.RagServiceGrpc;
import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;
import reactor.test.StepVerifier;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GatewayAiExecutionControllerTest {

    @Mock
    private RagServiceGrpc.RagServiceBlockingStub ragStub;
    @Mock
    private GrpcRagProperties grpcRagProperties;
    @Mock
    private JwtValidationService jwtValidationService;

    private GatewayAiExecutionController controller;

    @BeforeEach
    void setUp() {
        controller = new GatewayAiExecutionController(grpcRagProperties, jwtValidationService);
        ReflectionTestUtils.setField(controller, "ragStub", ragStub);
    }

    @Test
    @DisplayName("execute rejects invalid mode with 400 Bad Request")
    void startExecution_rejectsInvalidMode() {
        String userId = UUID.randomUUID().toString();
        Claims claims = mock(Claims.class);
        when(claims.getSubject()).thenReturn(userId);
        when(claims.get("role", String.class)).thenReturn("STUDENT");
        when(jwtValidationService.parseClaims("valid-token")).thenReturn(claims);

        StartAiExecutionRequest request = new StartAiExecutionRequest(
                null,
                "Hello AI",
                "invalid-mode-xyz",
                "gemini-2.0-flash",
                null, null, null, null
        );

        StepVerifier.create(controller.execute(request, "Bearer valid-token", "corr-1"))
                .expectErrorMatches(throwable -> throwable instanceof ResponseStatusException &&
                        ((ResponseStatusException) throwable).getStatusCode() == HttpStatus.BAD_REQUEST)
                .verify();
    }

    @Test
    @DisplayName("execute accepts 'chat' mode and dispatches execution")
    void startExecution_acceptsValidChatMode() {
        String userId = UUID.randomUUID().toString();
        Claims claims = mock(Claims.class);
        when(claims.getSubject()).thenReturn(userId);
        when(claims.get("role", String.class)).thenReturn("STUDENT");
        when(jwtValidationService.parseClaims("valid-token")).thenReturn(claims);
        when(grpcRagProperties.getServiceSecret()).thenReturn("test-rag-secret");
        when(ragStub.withInterceptors(any())).thenReturn(ragStub);

        ExecuteAcceptedResponse grpcResponse = ExecuteAcceptedResponse.newBuilder()
                .setRequestId("exec-12345")
                .setStatus("PENDING")
                .setStreamKey("stream:exec-12345")
                .setAccepted(true)
                .build();
        when(ragStub.executeDirect(any())).thenReturn(grpcResponse);

        StartAiExecutionRequest request = new StartAiExecutionRequest(
                "exec-12345",
                "Hello AI",
                "chat",
                "gemini-2.0-flash",
                null, null, null, null
        );

        StepVerifier.create(controller.execute(request, "Bearer valid-token", "corr-2"))
                .assertNext((ResponseEntity<StartAiExecutionResponse> response) -> {
                    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.ACCEPTED);
                    assertThat(response.getBody()).isNotNull();
                    assertThat(response.getBody().requestId()).isEqualTo("exec-12345");
                    assertThat(response.getBody().status()).isEqualTo("PENDING");
                })
                .verifyComplete();
    }
}
