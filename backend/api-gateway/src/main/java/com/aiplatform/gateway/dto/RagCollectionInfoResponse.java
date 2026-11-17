package com.aiplatform.gateway.dto;

public record RagCollectionInfoResponse(
        String collection,
        long vectorsCount,
        String status,
        String error
) {}