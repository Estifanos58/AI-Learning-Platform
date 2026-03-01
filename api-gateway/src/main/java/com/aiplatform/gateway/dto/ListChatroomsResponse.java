package com.aiplatform.gateway.dto;

import java.util.List;

public record ListChatroomsResponse(
        List<ChatroomResponse> chatrooms,
        long total
) {
}
