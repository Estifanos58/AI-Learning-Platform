package com.aiplatform.file.grpc.util;

import com.aiplatform.file.exception.DuplicateShareException;
import com.aiplatform.file.exception.FileNotFoundException;
import com.aiplatform.file.exception.InvalidFileOperationException;
import com.aiplatform.file.exception.UnauthorizedFileAccessException;
import io.grpc.Status;

public final class FileGrpcExceptionMapper {

    private FileGrpcExceptionMapper() {
    }

    public static io.grpc.StatusException toStatusException(Exception exception) {
        if (exception instanceof FileNotFoundException) {
            return Status.NOT_FOUND.withDescription(exception.getMessage()).asException();
        }
        if (exception instanceof UnauthorizedFileAccessException) {
            return Status.PERMISSION_DENIED.withDescription(exception.getMessage()).asException();
        }
        if (exception instanceof InvalidFileOperationException || exception instanceof IllegalArgumentException) {
            return Status.INVALID_ARGUMENT.withDescription(exception.getMessage()).asException();
        }
        if (exception instanceof DuplicateShareException) {
            return Status.ALREADY_EXISTS.withDescription(exception.getMessage()).asException();
        }
        return Status.INTERNAL.withDescription("Unexpected internal error").withCause(exception).asException();
    }
}
