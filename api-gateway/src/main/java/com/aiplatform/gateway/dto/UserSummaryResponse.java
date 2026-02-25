package com.aiplatform.gateway.dto;

import com.aiplatform.auth.proto.Role;

public record UserSummaryResponse(
        String id,
        String email,
        String username,
        Role role,
        String status,
        Boolean emailVerified
) {

}
