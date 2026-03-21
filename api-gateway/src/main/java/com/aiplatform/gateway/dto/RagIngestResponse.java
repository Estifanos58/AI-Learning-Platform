package com.aiplatform.gateway.dto;

public record RagIngestResponse(
        String status,
        String fileId,
        int chunksStored
) {}