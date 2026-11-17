package com.aiplatform.gateway.util;

import io.grpc.Status;
import io.grpc.StatusRuntimeException;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public final class GrpcExceptionMapper {

    private GrpcExceptionMapper() {
    }

    public static Throwable toResponseStatus(Throwable throwable) {
        if (!(throwable instanceof StatusRuntimeException statusRuntimeException)) {
            return throwable;
        }

        Status.Code code = statusRuntimeException.getStatus().getCode();
        HttpStatus status = switch (code) {
            case INVALID_ARGUMENT -> HttpStatus.BAD_REQUEST;
            case UNAUTHENTICATED -> HttpStatus.UNAUTHORIZED;
            case PERMISSION_DENIED -> HttpStatus.FORBIDDEN;
            case NOT_FOUND -> HttpStatus.NOT_FOUND;
            case ALREADY_EXISTS -> HttpStatus.CONFLICT;
            case RESOURCE_EXHAUSTED -> HttpStatus.TOO_MANY_REQUESTS;
            case DEADLINE_EXCEEDED -> HttpStatus.GATEWAY_TIMEOUT;
            case UNAVAILABLE -> HttpStatus.SERVICE_UNAVAILABLE;
            case ABORTED -> HttpStatus.CONFLICT;
            case FAILED_PRECONDITION -> HttpStatus.BAD_REQUEST;
            default -> HttpStatus.BAD_GATEWAY;
        };

        String message = switch (status) {
            case BAD_REQUEST -> "Request validation failed";
            case UNAUTHORIZED -> "Authentication required";
            case FORBIDDEN -> "Insufficient permissions";
            case NOT_FOUND -> "Resource not found";
            case CONFLICT -> "Request conflicts with current resource state";
            case TOO_MANY_REQUESTS -> "Too many requests";
            case GATEWAY_TIMEOUT -> "Upstream service timeout";
            case SERVICE_UNAVAILABLE -> "Upstream service unavailable";
            case BAD_GATEWAY -> "Upstream service error";
            default -> "Gateway request failed";
        };

        return new ResponseStatusException(status, message, throwable);
    }
}
