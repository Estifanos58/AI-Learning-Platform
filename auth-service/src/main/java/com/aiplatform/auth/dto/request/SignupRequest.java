package com.aiplatform.auth.dto.request;

import com.aiplatform.auth.domain.User;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class SignupRequest {
    @Email
    @NotBlank
    private String email;
    private String username;
    @NotBlank
    @Size(min = 8)
    private String password;
    private User.Role role = User.Role.STUDENT;
}
