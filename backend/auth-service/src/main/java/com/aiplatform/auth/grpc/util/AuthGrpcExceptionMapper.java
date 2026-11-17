package com.aiplatform.auth.grpc.util;

import com.aiplatform.auth.exception.ApiException;
import io.grpc.Status;
import org.springframework.http.HttpStatus;

public final class AuthGrpcExceptionMapper {

    private AuthGrpcExceptionMapper() {
    }

    public static io.grpc.StatusException toStatusException(Exception exception) {
        if (exception instanceof ApiException apiException) {
            return toGrpcStatus(apiException.getStatus())
                    .withDescription(apiException.getMessage())
                    .asException();
        }
        return Status.INTERNAL.withDescription("Unexpected internal error").withCause(exception).asException();
    }

    private static Status toGrpcStatus(HttpStatus status) {
        return switch (status) {
            case BAD_REQUEST -> Status.INVALID_ARGUMENT;
            case UNAUTHORIZED -> Status.UNAUTHENTICATED;
            case FORBIDDEN -> Status.PERMISSION_DENIED;
            case NOT_FOUND -> Status.NOT_FOUND;
            case CONFLICT -> Status.ALREADY_EXISTS;
            case TOO_MANY_REQUESTS -> Status.RESOURCE_EXHAUSTED;
            default -> Status.INTERNAL;
        };
    }
}
