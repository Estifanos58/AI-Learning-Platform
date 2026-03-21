package com.aiplatform.gateway.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

public record RagRetrieveRequest(
        @NotBlank @Size(max = 8000) String query,
        List<String> fileIds,
        @Min(1) @Max(100) Integer topK
) {}