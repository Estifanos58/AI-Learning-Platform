package com.aiplatform.gateway.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.List;
import java.util.Map;

public record StartAiExecutionRequest(
        String requestId,
        @NotBlank String prompt,
        String mode,
        String aiModelId,
        List<String> fileIds,
        String chatroomId,
        String messageId,
        Map<String, String> options
) {}
