package com.aiplatform.gateway.dto;

import com.aiplatform.profile.proto.ProfileVisibility;
import jakarta.validation.constraints.NotNull;

public record ProfileVisibilityUpdateRequest(@NotNull ProfileVisibility visibility) {
}
