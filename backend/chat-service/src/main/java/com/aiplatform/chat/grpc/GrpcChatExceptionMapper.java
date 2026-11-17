package com.aiplatform.chat.grpc;

import com.aiplatform.chat.exception.ChatroomNotFoundException;
import com.aiplatform.chat.exception.InvalidChatOperationException;
import com.aiplatform.chat.exception.UnauthorizedChatAccessException;
import io.grpc.Status;
import io.grpc.StatusException;

public final class GrpcChatExceptionMapper {
    private GrpcChatExceptionMapper() {}

    public static StatusException toStatusException(Exception exception) {
        if (exception instanceof ChatroomNotFoundException) {
            return Status.NOT_FOUND.withDescription(exception.getMessage()).asException();
        }
        if (exception instanceof UnauthorizedChatAccessException) {
            return Status.PERMISSION_DENIED.withDescription(exception.getMessage()).asException();
        }
        if (exception instanceof InvalidChatOperationException) {
            return Status.INVALID_ARGUMENT.withDescription(exception.getMessage()).asException();
        }
        return Status.INTERNAL.withDescription("Internal error").asException();
    }
}
