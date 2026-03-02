package com.aiplatform.gateway.dto;

import java.util.List;

public record ChatroomDto(
        String id,
        String type,
        List<String> memberIds,
        String createdAt
) {}
