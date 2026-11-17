package com.aiplatform.profile.grpc.util;

import com.aiplatform.profile.exception.DuplicateProfileException;
import com.aiplatform.profile.exception.InvalidUpdateException;
import com.aiplatform.profile.exception.ProfileNotFoundException;
import com.aiplatform.profile.exception.UnauthorizedAccessException;
import io.grpc.Status;

public final class UserProfileGrpcExceptionMapper {

    private UserProfileGrpcExceptionMapper() {
    }

    public static io.grpc.StatusException toStatusException(Exception exception) {
        if (exception instanceof ProfileNotFoundException) {
            return Status.NOT_FOUND.withDescription(exception.getMessage()).asException();
        }
        if (exception instanceof UnauthorizedAccessException) {
            return Status.PERMISSION_DENIED.withDescription(exception.getMessage()).asException();
        }
        if (exception instanceof InvalidUpdateException || exception instanceof IllegalArgumentException) {
            return Status.INVALID_ARGUMENT.withDescription(exception.getMessage()).asException();
        }
        if (exception instanceof DuplicateProfileException) {
            return Status.ALREADY_EXISTS.withDescription(exception.getMessage()).asException();
        }
        return Status.INTERNAL.withDescription("Unexpected internal error").withCause(exception).asException();
    }
}
