package com.aiplatform.auth.proto;

import static io.grpc.MethodDescriptor.generateFullMethodName;

/**
 */
@javax.annotation.Generated(
    value = "by gRPC proto compiler (version 1.69.0)",
    comments = "Source: auth.proto")
@io.grpc.stub.annotations.GrpcGenerated
public final class AuthServiceGrpc {

  private AuthServiceGrpc() {}

  public static final java.lang.String SERVICE_NAME = "auth.v1.AuthService";

  // Static method descriptors that strictly reflect the proto.
  private static volatile io.grpc.MethodDescriptor<com.aiplatform.auth.proto.SignupRequest,
      com.aiplatform.auth.proto.AuthResponse> getSignupMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "Signup",
      requestType = com.aiplatform.auth.proto.SignupRequest.class,
      responseType = com.aiplatform.auth.proto.AuthResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.aiplatform.auth.proto.SignupRequest,
      com.aiplatform.auth.proto.AuthResponse> getSignupMethod() {
    io.grpc.MethodDescriptor<com.aiplatform.auth.proto.SignupRequest, com.aiplatform.auth.proto.AuthResponse> getSignupMethod;
    if ((getSignupMethod = AuthServiceGrpc.getSignupMethod) == null) {
      synchronized (AuthServiceGrpc.class) {
        if ((getSignupMethod = AuthServiceGrpc.getSignupMethod) == null) {
          AuthServiceGrpc.getSignupMethod = getSignupMethod =
              io.grpc.MethodDescriptor.<com.aiplatform.auth.proto.SignupRequest, com.aiplatform.auth.proto.AuthResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "Signup"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.auth.proto.SignupRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.auth.proto.AuthResponse.getDefaultInstance()))
              .setSchemaDescriptor(new AuthServiceMethodDescriptorSupplier("Signup"))
              .build();
        }
      }
    }
    return getSignupMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.aiplatform.auth.proto.LoginRequest,
      com.aiplatform.auth.proto.AuthResponse> getLoginMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "Login",
      requestType = com.aiplatform.auth.proto.LoginRequest.class,
      responseType = com.aiplatform.auth.proto.AuthResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.aiplatform.auth.proto.LoginRequest,
      com.aiplatform.auth.proto.AuthResponse> getLoginMethod() {
    io.grpc.MethodDescriptor<com.aiplatform.auth.proto.LoginRequest, com.aiplatform.auth.proto.AuthResponse> getLoginMethod;
    if ((getLoginMethod = AuthServiceGrpc.getLoginMethod) == null) {
      synchronized (AuthServiceGrpc.class) {
        if ((getLoginMethod = AuthServiceGrpc.getLoginMethod) == null) {
          AuthServiceGrpc.getLoginMethod = getLoginMethod =
              io.grpc.MethodDescriptor.<com.aiplatform.auth.proto.LoginRequest, com.aiplatform.auth.proto.AuthResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "Login"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.auth.proto.LoginRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.auth.proto.AuthResponse.getDefaultInstance()))
              .setSchemaDescriptor(new AuthServiceMethodDescriptorSupplier("Login"))
              .build();
        }
      }
    }
    return getLoginMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.aiplatform.auth.proto.VerifyRequest,
      com.aiplatform.auth.proto.SimpleResponse> getVerifyEmailMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "VerifyEmail",
      requestType = com.aiplatform.auth.proto.VerifyRequest.class,
      responseType = com.aiplatform.auth.proto.SimpleResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.aiplatform.auth.proto.VerifyRequest,
      com.aiplatform.auth.proto.SimpleResponse> getVerifyEmailMethod() {
    io.grpc.MethodDescriptor<com.aiplatform.auth.proto.VerifyRequest, com.aiplatform.auth.proto.SimpleResponse> getVerifyEmailMethod;
    if ((getVerifyEmailMethod = AuthServiceGrpc.getVerifyEmailMethod) == null) {
      synchronized (AuthServiceGrpc.class) {
        if ((getVerifyEmailMethod = AuthServiceGrpc.getVerifyEmailMethod) == null) {
          AuthServiceGrpc.getVerifyEmailMethod = getVerifyEmailMethod =
              io.grpc.MethodDescriptor.<com.aiplatform.auth.proto.VerifyRequest, com.aiplatform.auth.proto.SimpleResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "VerifyEmail"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.auth.proto.VerifyRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.auth.proto.SimpleResponse.getDefaultInstance()))
              .setSchemaDescriptor(new AuthServiceMethodDescriptorSupplier("VerifyEmail"))
              .build();
        }
      }
    }
    return getVerifyEmailMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.aiplatform.auth.proto.RefreshRequest,
      com.aiplatform.auth.proto.AuthResponse> getRefreshTokenMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "RefreshToken",
      requestType = com.aiplatform.auth.proto.RefreshRequest.class,
      responseType = com.aiplatform.auth.proto.AuthResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.aiplatform.auth.proto.RefreshRequest,
      com.aiplatform.auth.proto.AuthResponse> getRefreshTokenMethod() {
    io.grpc.MethodDescriptor<com.aiplatform.auth.proto.RefreshRequest, com.aiplatform.auth.proto.AuthResponse> getRefreshTokenMethod;
    if ((getRefreshTokenMethod = AuthServiceGrpc.getRefreshTokenMethod) == null) {
      synchronized (AuthServiceGrpc.class) {
        if ((getRefreshTokenMethod = AuthServiceGrpc.getRefreshTokenMethod) == null) {
          AuthServiceGrpc.getRefreshTokenMethod = getRefreshTokenMethod =
              io.grpc.MethodDescriptor.<com.aiplatform.auth.proto.RefreshRequest, com.aiplatform.auth.proto.AuthResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "RefreshToken"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.auth.proto.RefreshRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.auth.proto.AuthResponse.getDefaultInstance()))
              .setSchemaDescriptor(new AuthServiceMethodDescriptorSupplier("RefreshToken"))
              .build();
        }
      }
    }
    return getRefreshTokenMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.aiplatform.auth.proto.LogoutRequest,
      com.aiplatform.auth.proto.SimpleResponse> getLogoutMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "Logout",
      requestType = com.aiplatform.auth.proto.LogoutRequest.class,
      responseType = com.aiplatform.auth.proto.SimpleResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.aiplatform.auth.proto.LogoutRequest,
      com.aiplatform.auth.proto.SimpleResponse> getLogoutMethod() {
    io.grpc.MethodDescriptor<com.aiplatform.auth.proto.LogoutRequest, com.aiplatform.auth.proto.SimpleResponse> getLogoutMethod;
    if ((getLogoutMethod = AuthServiceGrpc.getLogoutMethod) == null) {
      synchronized (AuthServiceGrpc.class) {
        if ((getLogoutMethod = AuthServiceGrpc.getLogoutMethod) == null) {
          AuthServiceGrpc.getLogoutMethod = getLogoutMethod =
              io.grpc.MethodDescriptor.<com.aiplatform.auth.proto.LogoutRequest, com.aiplatform.auth.proto.SimpleResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "Logout"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.auth.proto.LogoutRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.auth.proto.SimpleResponse.getDefaultInstance()))
              .setSchemaDescriptor(new AuthServiceMethodDescriptorSupplier("Logout"))
              .build();
        }
      }
    }
    return getLogoutMethod;
  }

  /**
   * Creates a new async stub that supports all call types for the service
   */
  public static AuthServiceStub newStub(io.grpc.Channel channel) {
    io.grpc.stub.AbstractStub.StubFactory<AuthServiceStub> factory =
      new io.grpc.stub.AbstractStub.StubFactory<AuthServiceStub>() {
        @java.lang.Override
        public AuthServiceStub newStub(io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
          return new AuthServiceStub(channel, callOptions);
        }
      };
    return AuthServiceStub.newStub(factory, channel);
  }

  /**
   * Creates a new blocking-style stub that supports unary and streaming output calls on the service
   */
  public static AuthServiceBlockingStub newBlockingStub(
      io.grpc.Channel channel) {
    io.grpc.stub.AbstractStub.StubFactory<AuthServiceBlockingStub> factory =
      new io.grpc.stub.AbstractStub.StubFactory<AuthServiceBlockingStub>() {
        @java.lang.Override
        public AuthServiceBlockingStub newStub(io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
          return new AuthServiceBlockingStub(channel, callOptions);
        }
      };
    return AuthServiceBlockingStub.newStub(factory, channel);
  }

  /**
   * Creates a new ListenableFuture-style stub that supports unary calls on the service
   */
  public static AuthServiceFutureStub newFutureStub(
      io.grpc.Channel channel) {
    io.grpc.stub.AbstractStub.StubFactory<AuthServiceFutureStub> factory =
      new io.grpc.stub.AbstractStub.StubFactory<AuthServiceFutureStub>() {
        @java.lang.Override
        public AuthServiceFutureStub newStub(io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
          return new AuthServiceFutureStub(channel, callOptions);
        }
      };
    return AuthServiceFutureStub.newStub(factory, channel);
  }

  /**
   */
  public interface AsyncService {

    /**
     */
    default void signup(com.aiplatform.auth.proto.SignupRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.auth.proto.AuthResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getSignupMethod(), responseObserver);
    }

    /**
     */
    default void login(com.aiplatform.auth.proto.LoginRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.auth.proto.AuthResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getLoginMethod(), responseObserver);
    }

    /**
     */
    default void verifyEmail(com.aiplatform.auth.proto.VerifyRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.auth.proto.SimpleResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getVerifyEmailMethod(), responseObserver);
    }

    /**
     */
    default void refreshToken(com.aiplatform.auth.proto.RefreshRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.auth.proto.AuthResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getRefreshTokenMethod(), responseObserver);
    }

    /**
     */
    default void logout(com.aiplatform.auth.proto.LogoutRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.auth.proto.SimpleResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getLogoutMethod(), responseObserver);
    }
  }

  /**
   * Base class for the server implementation of the service AuthService.
   */
  public static abstract class AuthServiceImplBase
      implements io.grpc.BindableService, AsyncService {

    @java.lang.Override public final io.grpc.ServerServiceDefinition bindService() {
      return AuthServiceGrpc.bindService(this);
    }
  }

  /**
   * A stub to allow clients to do asynchronous rpc calls to service AuthService.
   */
  public static final class AuthServiceStub
      extends io.grpc.stub.AbstractAsyncStub<AuthServiceStub> {
    private AuthServiceStub(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      super(channel, callOptions);
    }

    @java.lang.Override
    protected AuthServiceStub build(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      return new AuthServiceStub(channel, callOptions);
    }

    /**
     */
    public void signup(com.aiplatform.auth.proto.SignupRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.auth.proto.AuthResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getSignupMethod(), getCallOptions()), request, responseObserver);
    }

    /**
     */
    public void login(com.aiplatform.auth.proto.LoginRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.auth.proto.AuthResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getLoginMethod(), getCallOptions()), request, responseObserver);
    }

    /**
     */
    public void verifyEmail(com.aiplatform.auth.proto.VerifyRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.auth.proto.SimpleResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getVerifyEmailMethod(), getCallOptions()), request, responseObserver);
    }

    /**
     */
    public void refreshToken(com.aiplatform.auth.proto.RefreshRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.auth.proto.AuthResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getRefreshTokenMethod(), getCallOptions()), request, responseObserver);
    }

    /**
     */
    public void logout(com.aiplatform.auth.proto.LogoutRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.auth.proto.SimpleResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getLogoutMethod(), getCallOptions()), request, responseObserver);
    }
  }

  /**
   * A stub to allow clients to do synchronous rpc calls to service AuthService.
   */
  public static final class AuthServiceBlockingStub
      extends io.grpc.stub.AbstractBlockingStub<AuthServiceBlockingStub> {
    private AuthServiceBlockingStub(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      super(channel, callOptions);
    }

    @java.lang.Override
    protected AuthServiceBlockingStub build(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      return new AuthServiceBlockingStub(channel, callOptions);
    }

    /**
     */
    public com.aiplatform.auth.proto.AuthResponse signup(com.aiplatform.auth.proto.SignupRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getSignupMethod(), getCallOptions(), request);
    }

    /**
     */
    public com.aiplatform.auth.proto.AuthResponse login(com.aiplatform.auth.proto.LoginRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getLoginMethod(), getCallOptions(), request);
    }

    /**
     */
    public com.aiplatform.auth.proto.SimpleResponse verifyEmail(com.aiplatform.auth.proto.VerifyRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getVerifyEmailMethod(), getCallOptions(), request);
    }

    /**
     */
    public com.aiplatform.auth.proto.AuthResponse refreshToken(com.aiplatform.auth.proto.RefreshRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getRefreshTokenMethod(), getCallOptions(), request);
    }

    /**
     */
    public com.aiplatform.auth.proto.SimpleResponse logout(com.aiplatform.auth.proto.LogoutRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getLogoutMethod(), getCallOptions(), request);
    }
  }

  /**
   * A stub to allow clients to do ListenableFuture-style rpc calls to service AuthService.
   */
  public static final class AuthServiceFutureStub
      extends io.grpc.stub.AbstractFutureStub<AuthServiceFutureStub> {
    private AuthServiceFutureStub(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      super(channel, callOptions);
    }

    @java.lang.Override
    protected AuthServiceFutureStub build(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      return new AuthServiceFutureStub(channel, callOptions);
    }

    /**
     */
    public com.google.common.util.concurrent.ListenableFuture<com.aiplatform.auth.proto.AuthResponse> signup(
        com.aiplatform.auth.proto.SignupRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getSignupMethod(), getCallOptions()), request);
    }

    /**
     */
    public com.google.common.util.concurrent.ListenableFuture<com.aiplatform.auth.proto.AuthResponse> login(
        com.aiplatform.auth.proto.LoginRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getLoginMethod(), getCallOptions()), request);
    }

    /**
     */
    public com.google.common.util.concurrent.ListenableFuture<com.aiplatform.auth.proto.SimpleResponse> verifyEmail(
        com.aiplatform.auth.proto.VerifyRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getVerifyEmailMethod(), getCallOptions()), request);
    }

    /**
     */
    public com.google.common.util.concurrent.ListenableFuture<com.aiplatform.auth.proto.AuthResponse> refreshToken(
        com.aiplatform.auth.proto.RefreshRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getRefreshTokenMethod(), getCallOptions()), request);
    }

    /**
     */
    public com.google.common.util.concurrent.ListenableFuture<com.aiplatform.auth.proto.SimpleResponse> logout(
        com.aiplatform.auth.proto.LogoutRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getLogoutMethod(), getCallOptions()), request);
    }
  }

  private static final int METHODID_SIGNUP = 0;
  private static final int METHODID_LOGIN = 1;
  private static final int METHODID_VERIFY_EMAIL = 2;
  private static final int METHODID_REFRESH_TOKEN = 3;
  private static final int METHODID_LOGOUT = 4;

  private static final class MethodHandlers<Req, Resp> implements
      io.grpc.stub.ServerCalls.UnaryMethod<Req, Resp>,
      io.grpc.stub.ServerCalls.ServerStreamingMethod<Req, Resp>,
      io.grpc.stub.ServerCalls.ClientStreamingMethod<Req, Resp>,
      io.grpc.stub.ServerCalls.BidiStreamingMethod<Req, Resp> {
    private final AsyncService serviceImpl;
    private final int methodId;

    MethodHandlers(AsyncService serviceImpl, int methodId) {
      this.serviceImpl = serviceImpl;
      this.methodId = methodId;
    }

    @java.lang.Override
    @java.lang.SuppressWarnings("unchecked")
    public void invoke(Req request, io.grpc.stub.StreamObserver<Resp> responseObserver) {
      switch (methodId) {
        case METHODID_SIGNUP:
          serviceImpl.signup((com.aiplatform.auth.proto.SignupRequest) request,
              (io.grpc.stub.StreamObserver<com.aiplatform.auth.proto.AuthResponse>) responseObserver);
          break;
        case METHODID_LOGIN:
          serviceImpl.login((com.aiplatform.auth.proto.LoginRequest) request,
              (io.grpc.stub.StreamObserver<com.aiplatform.auth.proto.AuthResponse>) responseObserver);
          break;
        case METHODID_VERIFY_EMAIL:
          serviceImpl.verifyEmail((com.aiplatform.auth.proto.VerifyRequest) request,
              (io.grpc.stub.StreamObserver<com.aiplatform.auth.proto.SimpleResponse>) responseObserver);
          break;
        case METHODID_REFRESH_TOKEN:
          serviceImpl.refreshToken((com.aiplatform.auth.proto.RefreshRequest) request,
              (io.grpc.stub.StreamObserver<com.aiplatform.auth.proto.AuthResponse>) responseObserver);
          break;
        case METHODID_LOGOUT:
          serviceImpl.logout((com.aiplatform.auth.proto.LogoutRequest) request,
              (io.grpc.stub.StreamObserver<com.aiplatform.auth.proto.SimpleResponse>) responseObserver);
          break;
        default:
          throw new AssertionError();
      }
    }

    @java.lang.Override
    @java.lang.SuppressWarnings("unchecked")
    public io.grpc.stub.StreamObserver<Req> invoke(
        io.grpc.stub.StreamObserver<Resp> responseObserver) {
      switch (methodId) {
        default:
          throw new AssertionError();
      }
    }
  }

  public static final io.grpc.ServerServiceDefinition bindService(AsyncService service) {
    return io.grpc.ServerServiceDefinition.builder(getServiceDescriptor())
        .addMethod(
          getSignupMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.aiplatform.auth.proto.SignupRequest,
              com.aiplatform.auth.proto.AuthResponse>(
                service, METHODID_SIGNUP)))
        .addMethod(
          getLoginMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.aiplatform.auth.proto.LoginRequest,
              com.aiplatform.auth.proto.AuthResponse>(
                service, METHODID_LOGIN)))
        .addMethod(
          getVerifyEmailMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.aiplatform.auth.proto.VerifyRequest,
              com.aiplatform.auth.proto.SimpleResponse>(
                service, METHODID_VERIFY_EMAIL)))
        .addMethod(
          getRefreshTokenMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.aiplatform.auth.proto.RefreshRequest,
              com.aiplatform.auth.proto.AuthResponse>(
                service, METHODID_REFRESH_TOKEN)))
        .addMethod(
          getLogoutMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.aiplatform.auth.proto.LogoutRequest,
              com.aiplatform.auth.proto.SimpleResponse>(
                service, METHODID_LOGOUT)))
        .build();
  }

  private static abstract class AuthServiceBaseDescriptorSupplier
      implements io.grpc.protobuf.ProtoFileDescriptorSupplier, io.grpc.protobuf.ProtoServiceDescriptorSupplier {
    AuthServiceBaseDescriptorSupplier() {}

    @java.lang.Override
    public com.google.protobuf.Descriptors.FileDescriptor getFileDescriptor() {
      return com.aiplatform.auth.proto.AuthProto.getDescriptor();
    }

    @java.lang.Override
    public com.google.protobuf.Descriptors.ServiceDescriptor getServiceDescriptor() {
      return getFileDescriptor().findServiceByName("AuthService");
    }
  }

  private static final class AuthServiceFileDescriptorSupplier
      extends AuthServiceBaseDescriptorSupplier {
    AuthServiceFileDescriptorSupplier() {}
  }

  private static final class AuthServiceMethodDescriptorSupplier
      extends AuthServiceBaseDescriptorSupplier
      implements io.grpc.protobuf.ProtoMethodDescriptorSupplier {
    private final java.lang.String methodName;

    AuthServiceMethodDescriptorSupplier(java.lang.String methodName) {
      this.methodName = methodName;
    }

    @java.lang.Override
    public com.google.protobuf.Descriptors.MethodDescriptor getMethodDescriptor() {
      return getServiceDescriptor().findMethodByName(methodName);
    }
  }

  private static volatile io.grpc.ServiceDescriptor serviceDescriptor;

  public static io.grpc.ServiceDescriptor getServiceDescriptor() {
    io.grpc.ServiceDescriptor result = serviceDescriptor;
    if (result == null) {
      synchronized (AuthServiceGrpc.class) {
        result = serviceDescriptor;
        if (result == null) {
          serviceDescriptor = result = io.grpc.ServiceDescriptor.newBuilder(SERVICE_NAME)
              .setSchemaDescriptor(new AuthServiceFileDescriptorSupplier())
              .addMethod(getSignupMethod())
              .addMethod(getLoginMethod())
              .addMethod(getVerifyEmailMethod())
              .addMethod(getRefreshTokenMethod())
              .addMethod(getLogoutMethod())
              .build();
        }
      }
    }
    return result;
  }
}
