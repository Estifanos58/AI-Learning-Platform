package com.aiplatform.chat.exception;

public class UnauthorizedChatAccessException extends RuntimeException {
    public UnauthorizedChatAccessException(String message) {
        super(message);
    }
}
