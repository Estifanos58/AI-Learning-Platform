package com.aiplatform.gateway.dto;

import java.util.List;

public record ListDirectChatroomsResponse(
        List<DirectChatroomResponse> chatrooms,
        long total
) {
}
