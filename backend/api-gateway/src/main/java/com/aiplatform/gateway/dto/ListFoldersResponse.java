package com.aiplatform.gateway.dto;

import java.util.List;

public record ListFoldersResponse(
        List<FolderResponse> folders,
        long total
) {
}
