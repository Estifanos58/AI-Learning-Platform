package com.aiplatform.gateway.dto;

public record StartAiExecutionResponse(
        String status,
        String requestId,
        String streamKey,
        boolean accepted
) {}
