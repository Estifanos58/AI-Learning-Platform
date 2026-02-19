package com.aiplatform.auth.mapper;

import com.aiplatform.auth.domain.User;
import com.aiplatform.auth.dto.UserSummaryResponse;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface UserMapper {

    UserSummaryResponse toSummary(User user);
}