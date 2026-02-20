package com.aiplatform.auth.mapper;

import com.aiplatform.auth.domain.Role;
import com.aiplatform.auth.domain.User;
import com.aiplatform.auth.domain.UserStatus;
import com.aiplatform.auth.dto.UserSummaryResponse;
import java.util.UUID;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-02-20T21:32:34+0300",
    comments = "version: 1.6.3, compiler: javac, environment: Java 21.0.10 (Oracle Corporation)"
)
@Component
public class UserMapperImpl implements UserMapper {

    @Override
    public UserSummaryResponse toSummary(User user) {
        if ( user == null ) {
            return null;
        }

        UUID id = null;
        String email = null;
        String username = null;
        Role role = null;
        UserStatus status = null;
        Boolean emailVerified = null;

        id = user.getId();
        email = user.getEmail();
        username = user.getUsername();
        role = user.getRole();
        status = user.getStatus();
        emailVerified = user.getEmailVerified();

        UserSummaryResponse userSummaryResponse = new UserSummaryResponse( id, email, username, role, status, emailVerified );

        return userSummaryResponse;
    }
}
