package com.aiplatform.gateway.dto;

import java.util.List;

public record RagRetrieveResponse(
        String query,
        int chunkCount,
        List<RagRetrieveChunkResponse> chunks
) {}