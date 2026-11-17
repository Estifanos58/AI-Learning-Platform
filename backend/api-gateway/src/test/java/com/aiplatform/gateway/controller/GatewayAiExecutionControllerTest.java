package com.aiplatform.gateway.controller;

import com.aiplatform.gateway.config.GrpcRagProperties;
import com.aiplatform.gateway.dto.StartAiExecutionRequest;
import com.aiplatform.gateway.dto.StartAiExecutionResponse;
import com.aiplatform.gateway.security.JwtValidationService;
import com.aiplatform.gateway.util.GatewayPrincipal;
import com.aiplatform.rag.proto.ExecuteAcceptedResponse;
import com.aiplatform.rag.proto.RagServiceGrpc;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;
import reactor.test.StepVerifier;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
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
        when(grpcRagProperties.getServiceSecret()).thenReturn("test-rag-secret");
    }

    @Test
    @DisplayName("startExecution rejects invalid mode with 400 Bad Request")
    void startExecution_rejectsInvalidMode() {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth("valid-token");
        UUID userId = UUID.randomUUID();
        when(jwtValidationService.validateAndExtractPrincipal("valid-token"))
                .thenReturn(new GatewayPrincipal(userId, "STUDENT"));

        StartAiExecutionRequest request = new StartAiExecutionRequest(
                "gemini-2.0-flash",
                "invalid-mode-xyz",
                "Hello AI",
                null, null, null, null, null, null, null
        );

        StepVerifier.create(controller.startExecution(request, headers, "corr-1"))
                .expectErrorMatches(throwable -> throwable instanceof ResponseStatusException &&
                        ((ResponseStatusException) throwable).getStatusCode() == HttpStatus.BAD_REQUEST)
                .verify();
    }

    @Test
    @DisplayName("startExecution accepts 'chat' mode and dispatches execution")
    void startExecution_acceptsValidChatMode() {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth("valid-token");
        UUID userId = UUID.randomUUID();
        when(jwtValidationService.validateAndExtractPrincipal("valid-token"))
                .thenReturn(new GatewayPrincipal(userId, "STUDENT"));
        when(ragStub.withInterceptors(any())).thenReturn(ragStub);

        ExecuteAcceptedResponse grpcResponse = ExecuteAcceptedResponse.newBuilder()
                .setExecutionId("exec-12345")
                .setStatus("PENDING")
                .setMessage("Accepted")
                .build();
        when(ragStub.executeDirect(any())).thenReturn(grpcResponse);

        StartAiExecutionRequest request = new StartAiExecutionRequest(
                "gemini-2.0-flash",
                "chat",
                "Hello AI",
                null, null, null, null, null, null, null
        );

        StepVerifier.create(controller.startExecution(request, headers, "corr-2"))
                .assertNext((ResponseEntity<StartAiExecutionResponse> response) -> {
                    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.ACCEPTED);
                    assertThat(response.getBody()).isNotNull();
                    assertThat(response.getBody().executionId()).isEqualTo("exec-12345");
                    assertThat(response.getBody().status()).isEqualTo("PENDING");
                })
                .verifyComplete();
    }
}
