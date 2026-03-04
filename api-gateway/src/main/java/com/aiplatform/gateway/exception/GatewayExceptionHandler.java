package com.aiplatform.gateway.exception;

import com.aiplatform.gateway.dto.ApiErrorResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.support.WebExchangeBindException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.server.ServerWebInputException;
import org.springframework.web.server.ServerWebExchange;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@RestControllerAdvice
public class GatewayExceptionHandler {

    private static final String CORRELATION_HEADER = "X-Correlation-ID";
    private static final Logger log = LoggerFactory.getLogger(GatewayExceptionHandler.class);

    @ExceptionHandler(WebExchangeBindException.class)
    public ResponseEntity<ApiErrorResponse> handleValidation(
            WebExchangeBindException exception,
            ServerWebExchange exchange
    ) {
        Map<String, String> details = new LinkedHashMap<>();
        for (FieldError error : exception.getFieldErrors()) {
            details.put(error.getField(), error.getDefaultMessage());
        }

        return build(
                HttpStatus.BAD_REQUEST,
                "VALIDATION_FAILED",
                "Request validation failed",
                exchange,
                details,
                exception
        );
    }

    @ExceptionHandler(ServerWebInputException.class)
    public ResponseEntity<ApiErrorResponse> handleMalformedRequest(
            ServerWebInputException exception,
            ServerWebExchange exchange
    ) {
        return build(
                HttpStatus.BAD_REQUEST,
                "MALFORMED_REQUEST",
                "Request body or parameters are malformed",
                exchange,
                Map.of(),
                exception
        );
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ApiErrorResponse> handleResponseStatus(
            ResponseStatusException exception,
            ServerWebExchange exchange
    ) {
        HttpStatusCode statusCode = exception.getStatusCode();
        HttpStatus status = HttpStatus.resolve(statusCode.value());
        HttpStatus finalStatus = status != null ? status : HttpStatus.INTERNAL_SERVER_ERROR;

        String safeReason = safeMessage(finalStatus, exception.getReason());
        return build(
                finalStatus,
                mapCode(finalStatus),
                safeReason,
                exchange,
                Map.of(),
                exception
        );
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiErrorResponse> handleAccessDenied(
            AccessDeniedException exception,
            ServerWebExchange exchange
    ) {
        return build(
                HttpStatus.FORBIDDEN,
                "FORBIDDEN",
                "Insufficient permissions",
                exchange,
                Map.of(),
                exception
        );
    }

    @ExceptionHandler(Throwable.class)
    public ResponseEntity<ApiErrorResponse> handleUnexpected(
            Throwable exception,
            ServerWebExchange exchange
    ) {
        return build(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "INTERNAL_ERROR",
                "An unexpected error occurred",
                exchange,
                Map.of(),
                exception
        );
    }

    private ResponseEntity<ApiErrorResponse> build(
            HttpStatus status,
            String code,
            String message,
            ServerWebExchange exchange,
            Map<String, String> details,
            Throwable throwable
    ) {
        String correlationId = correlationId(exchange);
        String path = exchange.getRequest().getPath().value();

        if (status.is5xxServerError()) {
            log.error("Gateway error. status={} path={} correlationId={}", status.value(), path, correlationId, throwable);
        } else {
            log.warn("Gateway request failed. status={} path={} correlationId={} message={}",
                    status.value(), path, correlationId, message);
        }

        ApiErrorResponse response = new ApiErrorResponse(
                Instant.now().toString(),
                status.value(),
                status.getReasonPhrase(),
                code,
                message,
                path,
                correlationId,
                details
        );

        return ResponseEntity.status(status)
                .header(CORRELATION_HEADER, correlationId)
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .body(response);
    }

    private String correlationId(ServerWebExchange exchange) {
        String value = exchange.getRequest().getHeaders().getFirst(CORRELATION_HEADER);
        if (value != null && !value.isBlank()) {
            return value;
        }
        return UUID.randomUUID().toString();
    }

    private String mapCode(HttpStatus status) {
        return switch (status) {
            case BAD_REQUEST -> "BAD_REQUEST";
            case UNAUTHORIZED -> "UNAUTHORIZED";
            case FORBIDDEN -> "FORBIDDEN";
            case NOT_FOUND -> "NOT_FOUND";
            case METHOD_NOT_ALLOWED -> "METHOD_NOT_ALLOWED";
            case CONFLICT -> "CONFLICT";
            case TOO_MANY_REQUESTS -> "RATE_LIMITED";
            case SERVICE_UNAVAILABLE -> "SERVICE_UNAVAILABLE";
            case GATEWAY_TIMEOUT -> "UPSTREAM_TIMEOUT";
            case BAD_GATEWAY -> "UPSTREAM_ERROR";
            default -> status.is5xxServerError() ? "INTERNAL_ERROR" : "REQUEST_FAILED";
        };
    }

    private String safeMessage(HttpStatus status, String reason) {
        if (status.is5xxServerError()) {
            return "An unexpected error occurred";
        }

        return switch (status) {
            case UNAUTHORIZED -> "Authentication required";
            case FORBIDDEN -> "Insufficient permissions";
            case TOO_MANY_REQUESTS -> "Too many requests";
            default -> (reason == null || reason.isBlank()) ? "Request failed" : reason;
        };
    }
}
