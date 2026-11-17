package com.aiplatform.gateway.dto;

public record RagRetrieveChunkResponse(
        double score,
        String fileId,
        int pageNumber,
        String chunkTextPreview
) {}