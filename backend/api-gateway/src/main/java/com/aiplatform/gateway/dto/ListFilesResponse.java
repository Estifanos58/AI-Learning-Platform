package com.aiplatform.gateway.dto;

import java.util.List;

public record ListFilesResponse(
        List<FileResponse> files,
        long total
) {
}
