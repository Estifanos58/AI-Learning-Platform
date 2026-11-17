package com.aiplatform.auth.grpc;

public final class GrpcMetadataConstants {

    private GrpcMetadataConstants() {
    }

    public static final String CORRELATION_ID_HEADER = "x-correlation-id";
    public static final String SERVICE_SECRET_HEADER = "x-service-secret";
    public static final String USER_ID_HEADER = "x-user-id";
}
