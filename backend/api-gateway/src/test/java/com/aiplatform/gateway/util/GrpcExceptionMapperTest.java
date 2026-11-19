package com.aiplatform.gateway.util;

import io.grpc.Status;
import io.grpc.StatusRuntimeException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.assertThat;

class GrpcExceptionMapperTest {

    @Test
    @DisplayName("Maps ALREADY_EXISTS with upstream description to CONFLICT with upstream message")
    void mapsAlreadyExistsWithDescription() {
        StatusRuntimeException exception = Status.ALREADY_EXISTS
                .withDescription("Email already exists")
                .asRuntimeException();

        Throwable result = GrpcExceptionMapper.toResponseStatus(exception);

        assertThat(result).isInstanceOf(ResponseStatusException.class);
        ResponseStatusException responseStatus = (ResponseStatusException) result;
        assertThat(responseStatus.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(responseStatus.getReason()).isEqualTo("Email already exists");
    }

    @Test
    @DisplayName("Falls back to default message if upstream description is blank")
    void fallsBackToDefaultMessageIfDescriptionBlank() {
        StatusRuntimeException exception = Status.ALREADY_EXISTS
                .asRuntimeException();

        Throwable result = GrpcExceptionMapper.toResponseStatus(exception);

        assertThat(result).isInstanceOf(ResponseStatusException.class);
        ResponseStatusException responseStatus = (ResponseStatusException) result;
        assertThat(responseStatus.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(responseStatus.getReason()).isEqualTo("Request conflicts with current resource state");
    }
}
