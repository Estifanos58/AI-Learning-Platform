package com.aiplatform.chat.grpc.util;

import com.aiplatform.chat.exception.ChatNotFoundException;
import com.aiplatform.chat.exception.DuplicateMembershipException;
import com.aiplatform.chat.exception.InvalidChatOperationException;
import com.aiplatform.chat.exception.UnauthorizedChatAccessException;

import io.grpc.Status;

public final class ChatGrpcExceptionMapper {

    private ChatGrpcExceptionMapper() {
    }

    public static io.grpc.StatusException toStatusException(Exception exception) {
        if (exception instanceof ChatNotFoundException) {
            return Status.NOT_FOUND.withDescription(exception.getMessage()).asException();
        }
        if (exception instanceof UnauthorizedChatAccessException) {
            return Status.PERMISSION_DENIED.withDescription(exception.getMessage()).asException();
        }
        if (exception instanceof InvalidChatOperationException || exception instanceof IllegalArgumentException) {
            return Status.INVALID_ARGUMENT.withDescription(exception.getMessage()).asException();
        }
        if (exception instanceof DuplicateMembershipException) {
            return Status.ALREADY_EXISTS.withDescription(exception.getMessage()).asException();
        }
        return Status.INTERNAL.withDescription("Unexpected internal error").withCause(exception).asException();
    }
}
