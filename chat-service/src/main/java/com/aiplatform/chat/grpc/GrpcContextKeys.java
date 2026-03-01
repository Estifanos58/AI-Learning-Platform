package com.aiplatform.chat.grpc;

import io.grpc.Context;

public final class GrpcContextKeys {

    private GrpcContextKeys() {
    }

    public static final Context.Key<String> CORRELATION_ID = Context.key("correlation-id");
    public static final Context.Key<String> USER_ID = Context.key("user-id");
    public static final Context.Key<String> USER_ROLES = Context.key("user-roles");
    public static final Context.Key<String> UNIVERSITY_ID = Context.key("university-id");
}
