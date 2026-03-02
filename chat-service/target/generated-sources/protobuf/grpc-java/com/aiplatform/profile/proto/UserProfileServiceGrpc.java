package com.aiplatform.profile.proto;

import static io.grpc.MethodDescriptor.generateFullMethodName;

/**
 */
@javax.annotation.Generated(
    value = "by gRPC proto compiler (version 1.69.0)",
    comments = "Source: profile.proto")
@io.grpc.stub.annotations.GrpcGenerated
public final class UserProfileServiceGrpc {

  private UserProfileServiceGrpc() {}

  public static final java.lang.String SERVICE_NAME = "profile.v1.UserProfileService";

  // Static method descriptors that strictly reflect the proto.
  private static volatile io.grpc.MethodDescriptor<com.aiplatform.profile.proto.GetMyProfileRequest,
      com.aiplatform.profile.proto.UserProfileResponse> getGetMyProfileMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "GetMyProfile",
      requestType = com.aiplatform.profile.proto.GetMyProfileRequest.class,
      responseType = com.aiplatform.profile.proto.UserProfileResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.aiplatform.profile.proto.GetMyProfileRequest,
      com.aiplatform.profile.proto.UserProfileResponse> getGetMyProfileMethod() {
    io.grpc.MethodDescriptor<com.aiplatform.profile.proto.GetMyProfileRequest, com.aiplatform.profile.proto.UserProfileResponse> getGetMyProfileMethod;
    if ((getGetMyProfileMethod = UserProfileServiceGrpc.getGetMyProfileMethod) == null) {
      synchronized (UserProfileServiceGrpc.class) {
        if ((getGetMyProfileMethod = UserProfileServiceGrpc.getGetMyProfileMethod) == null) {
          UserProfileServiceGrpc.getGetMyProfileMethod = getGetMyProfileMethod =
              io.grpc.MethodDescriptor.<com.aiplatform.profile.proto.GetMyProfileRequest, com.aiplatform.profile.proto.UserProfileResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "GetMyProfile"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.profile.proto.GetMyProfileRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.profile.proto.UserProfileResponse.getDefaultInstance()))
              .setSchemaDescriptor(new UserProfileServiceMethodDescriptorSupplier("GetMyProfile"))
              .build();
        }
      }
    }
    return getGetMyProfileMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.aiplatform.profile.proto.GetProfileRequest,
      com.aiplatform.profile.proto.UserProfileResponse> getGetProfileByIdMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "GetProfileById",
      requestType = com.aiplatform.profile.proto.GetProfileRequest.class,
      responseType = com.aiplatform.profile.proto.UserProfileResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.aiplatform.profile.proto.GetProfileRequest,
      com.aiplatform.profile.proto.UserProfileResponse> getGetProfileByIdMethod() {
    io.grpc.MethodDescriptor<com.aiplatform.profile.proto.GetProfileRequest, com.aiplatform.profile.proto.UserProfileResponse> getGetProfileByIdMethod;
    if ((getGetProfileByIdMethod = UserProfileServiceGrpc.getGetProfileByIdMethod) == null) {
      synchronized (UserProfileServiceGrpc.class) {
        if ((getGetProfileByIdMethod = UserProfileServiceGrpc.getGetProfileByIdMethod) == null) {
          UserProfileServiceGrpc.getGetProfileByIdMethod = getGetProfileByIdMethod =
              io.grpc.MethodDescriptor.<com.aiplatform.profile.proto.GetProfileRequest, com.aiplatform.profile.proto.UserProfileResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "GetProfileById"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.profile.proto.GetProfileRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.profile.proto.UserProfileResponse.getDefaultInstance()))
              .setSchemaDescriptor(new UserProfileServiceMethodDescriptorSupplier("GetProfileById"))
              .build();
        }
      }
    }
    return getGetProfileByIdMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.aiplatform.profile.proto.UpdateProfileRequest,
      com.aiplatform.profile.proto.UserProfileResponse> getUpdateMyProfileMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "UpdateMyProfile",
      requestType = com.aiplatform.profile.proto.UpdateProfileRequest.class,
      responseType = com.aiplatform.profile.proto.UserProfileResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.aiplatform.profile.proto.UpdateProfileRequest,
      com.aiplatform.profile.proto.UserProfileResponse> getUpdateMyProfileMethod() {
    io.grpc.MethodDescriptor<com.aiplatform.profile.proto.UpdateProfileRequest, com.aiplatform.profile.proto.UserProfileResponse> getUpdateMyProfileMethod;
    if ((getUpdateMyProfileMethod = UserProfileServiceGrpc.getUpdateMyProfileMethod) == null) {
      synchronized (UserProfileServiceGrpc.class) {
        if ((getUpdateMyProfileMethod = UserProfileServiceGrpc.getUpdateMyProfileMethod) == null) {
          UserProfileServiceGrpc.getUpdateMyProfileMethod = getUpdateMyProfileMethod =
              io.grpc.MethodDescriptor.<com.aiplatform.profile.proto.UpdateProfileRequest, com.aiplatform.profile.proto.UserProfileResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "UpdateMyProfile"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.profile.proto.UpdateProfileRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.profile.proto.UserProfileResponse.getDefaultInstance()))
              .setSchemaDescriptor(new UserProfileServiceMethodDescriptorSupplier("UpdateMyProfile"))
              .build();
        }
      }
    }
    return getUpdateMyProfileMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.aiplatform.profile.proto.SearchProfilesRequest,
      com.aiplatform.profile.proto.SearchProfilesResponse> getSearchProfilesMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "SearchProfiles",
      requestType = com.aiplatform.profile.proto.SearchProfilesRequest.class,
      responseType = com.aiplatform.profile.proto.SearchProfilesResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.aiplatform.profile.proto.SearchProfilesRequest,
      com.aiplatform.profile.proto.SearchProfilesResponse> getSearchProfilesMethod() {
    io.grpc.MethodDescriptor<com.aiplatform.profile.proto.SearchProfilesRequest, com.aiplatform.profile.proto.SearchProfilesResponse> getSearchProfilesMethod;
    if ((getSearchProfilesMethod = UserProfileServiceGrpc.getSearchProfilesMethod) == null) {
      synchronized (UserProfileServiceGrpc.class) {
        if ((getSearchProfilesMethod = UserProfileServiceGrpc.getSearchProfilesMethod) == null) {
          UserProfileServiceGrpc.getSearchProfilesMethod = getSearchProfilesMethod =
              io.grpc.MethodDescriptor.<com.aiplatform.profile.proto.SearchProfilesRequest, com.aiplatform.profile.proto.SearchProfilesResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "SearchProfiles"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.profile.proto.SearchProfilesRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.profile.proto.SearchProfilesResponse.getDefaultInstance()))
              .setSchemaDescriptor(new UserProfileServiceMethodDescriptorSupplier("SearchProfiles"))
              .build();
        }
      }
    }
    return getSearchProfilesMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.aiplatform.profile.proto.UpdateVisibilityRequest,
      com.aiplatform.profile.proto.SimpleResponse> getUpdateProfileVisibilityMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "UpdateProfileVisibility",
      requestType = com.aiplatform.profile.proto.UpdateVisibilityRequest.class,
      responseType = com.aiplatform.profile.proto.SimpleResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.aiplatform.profile.proto.UpdateVisibilityRequest,
      com.aiplatform.profile.proto.SimpleResponse> getUpdateProfileVisibilityMethod() {
    io.grpc.MethodDescriptor<com.aiplatform.profile.proto.UpdateVisibilityRequest, com.aiplatform.profile.proto.SimpleResponse> getUpdateProfileVisibilityMethod;
    if ((getUpdateProfileVisibilityMethod = UserProfileServiceGrpc.getUpdateProfileVisibilityMethod) == null) {
      synchronized (UserProfileServiceGrpc.class) {
        if ((getUpdateProfileVisibilityMethod = UserProfileServiceGrpc.getUpdateProfileVisibilityMethod) == null) {
          UserProfileServiceGrpc.getUpdateProfileVisibilityMethod = getUpdateProfileVisibilityMethod =
              io.grpc.MethodDescriptor.<com.aiplatform.profile.proto.UpdateVisibilityRequest, com.aiplatform.profile.proto.SimpleResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "UpdateProfileVisibility"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.profile.proto.UpdateVisibilityRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.profile.proto.SimpleResponse.getDefaultInstance()))
              .setSchemaDescriptor(new UserProfileServiceMethodDescriptorSupplier("UpdateProfileVisibility"))
              .build();
        }
      }
    }
    return getUpdateProfileVisibilityMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.aiplatform.profile.proto.IncrementReputationRequest,
      com.aiplatform.profile.proto.SimpleResponse> getIncrementReputationMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "IncrementReputation",
      requestType = com.aiplatform.profile.proto.IncrementReputationRequest.class,
      responseType = com.aiplatform.profile.proto.SimpleResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.aiplatform.profile.proto.IncrementReputationRequest,
      com.aiplatform.profile.proto.SimpleResponse> getIncrementReputationMethod() {
    io.grpc.MethodDescriptor<com.aiplatform.profile.proto.IncrementReputationRequest, com.aiplatform.profile.proto.SimpleResponse> getIncrementReputationMethod;
    if ((getIncrementReputationMethod = UserProfileServiceGrpc.getIncrementReputationMethod) == null) {
      synchronized (UserProfileServiceGrpc.class) {
        if ((getIncrementReputationMethod = UserProfileServiceGrpc.getIncrementReputationMethod) == null) {
          UserProfileServiceGrpc.getIncrementReputationMethod = getIncrementReputationMethod =
              io.grpc.MethodDescriptor.<com.aiplatform.profile.proto.IncrementReputationRequest, com.aiplatform.profile.proto.SimpleResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "IncrementReputation"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.profile.proto.IncrementReputationRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.profile.proto.SimpleResponse.getDefaultInstance()))
              .setSchemaDescriptor(new UserProfileServiceMethodDescriptorSupplier("IncrementReputation"))
              .build();
        }
      }
    }
    return getIncrementReputationMethod;
  }

  /**
   * Creates a new async stub that supports all call types for the service
   */
  public static UserProfileServiceStub newStub(io.grpc.Channel channel) {
    io.grpc.stub.AbstractStub.StubFactory<UserProfileServiceStub> factory =
      new io.grpc.stub.AbstractStub.StubFactory<UserProfileServiceStub>() {
        @java.lang.Override
        public UserProfileServiceStub newStub(io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
          return new UserProfileServiceStub(channel, callOptions);
        }
      };
    return UserProfileServiceStub.newStub(factory, channel);
  }

  /**
   * Creates a new blocking-style stub that supports unary and streaming output calls on the service
   */
  public static UserProfileServiceBlockingStub newBlockingStub(
      io.grpc.Channel channel) {
    io.grpc.stub.AbstractStub.StubFactory<UserProfileServiceBlockingStub> factory =
      new io.grpc.stub.AbstractStub.StubFactory<UserProfileServiceBlockingStub>() {
        @java.lang.Override
        public UserProfileServiceBlockingStub newStub(io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
          return new UserProfileServiceBlockingStub(channel, callOptions);
        }
      };
    return UserProfileServiceBlockingStub.newStub(factory, channel);
  }

  /**
   * Creates a new ListenableFuture-style stub that supports unary calls on the service
   */
  public static UserProfileServiceFutureStub newFutureStub(
      io.grpc.Channel channel) {
    io.grpc.stub.AbstractStub.StubFactory<UserProfileServiceFutureStub> factory =
      new io.grpc.stub.AbstractStub.StubFactory<UserProfileServiceFutureStub>() {
        @java.lang.Override
        public UserProfileServiceFutureStub newStub(io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
          return new UserProfileServiceFutureStub(channel, callOptions);
        }
      };
    return UserProfileServiceFutureStub.newStub(factory, channel);
  }

  /**
   */
  public interface AsyncService {

    /**
     */
    default void getMyProfile(com.aiplatform.profile.proto.GetMyProfileRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.profile.proto.UserProfileResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getGetMyProfileMethod(), responseObserver);
    }

    /**
     */
    default void getProfileById(com.aiplatform.profile.proto.GetProfileRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.profile.proto.UserProfileResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getGetProfileByIdMethod(), responseObserver);
    }

    /**
     */
    default void updateMyProfile(com.aiplatform.profile.proto.UpdateProfileRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.profile.proto.UserProfileResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getUpdateMyProfileMethod(), responseObserver);
    }

    /**
     */
    default void searchProfiles(com.aiplatform.profile.proto.SearchProfilesRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.profile.proto.SearchProfilesResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getSearchProfilesMethod(), responseObserver);
    }

    /**
     */
    default void updateProfileVisibility(com.aiplatform.profile.proto.UpdateVisibilityRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.profile.proto.SimpleResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getUpdateProfileVisibilityMethod(), responseObserver);
    }

    /**
     */
    default void incrementReputation(com.aiplatform.profile.proto.IncrementReputationRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.profile.proto.SimpleResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getIncrementReputationMethod(), responseObserver);
    }
  }

  /**
   * Base class for the server implementation of the service UserProfileService.
   */
  public static abstract class UserProfileServiceImplBase
      implements io.grpc.BindableService, AsyncService {

    @java.lang.Override public final io.grpc.ServerServiceDefinition bindService() {
      return UserProfileServiceGrpc.bindService(this);
    }
  }

  /**
   * A stub to allow clients to do asynchronous rpc calls to service UserProfileService.
   */
  public static final class UserProfileServiceStub
      extends io.grpc.stub.AbstractAsyncStub<UserProfileServiceStub> {
    private UserProfileServiceStub(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      super(channel, callOptions);
    }

    @java.lang.Override
    protected UserProfileServiceStub build(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      return new UserProfileServiceStub(channel, callOptions);
    }

    /**
     */
    public void getMyProfile(com.aiplatform.profile.proto.GetMyProfileRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.profile.proto.UserProfileResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getGetMyProfileMethod(), getCallOptions()), request, responseObserver);
    }

    /**
     */
    public void getProfileById(com.aiplatform.profile.proto.GetProfileRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.profile.proto.UserProfileResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getGetProfileByIdMethod(), getCallOptions()), request, responseObserver);
    }

    /**
     */
    public void updateMyProfile(com.aiplatform.profile.proto.UpdateProfileRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.profile.proto.UserProfileResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getUpdateMyProfileMethod(), getCallOptions()), request, responseObserver);
    }

    /**
     */
    public void searchProfiles(com.aiplatform.profile.proto.SearchProfilesRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.profile.proto.SearchProfilesResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getSearchProfilesMethod(), getCallOptions()), request, responseObserver);
    }

    /**
     */
    public void updateProfileVisibility(com.aiplatform.profile.proto.UpdateVisibilityRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.profile.proto.SimpleResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getUpdateProfileVisibilityMethod(), getCallOptions()), request, responseObserver);
    }

    /**
     */
    public void incrementReputation(com.aiplatform.profile.proto.IncrementReputationRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.profile.proto.SimpleResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getIncrementReputationMethod(), getCallOptions()), request, responseObserver);
    }
  }

  /**
   * A stub to allow clients to do synchronous rpc calls to service UserProfileService.
   */
  public static final class UserProfileServiceBlockingStub
      extends io.grpc.stub.AbstractBlockingStub<UserProfileServiceBlockingStub> {
    private UserProfileServiceBlockingStub(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      super(channel, callOptions);
    }

    @java.lang.Override
    protected UserProfileServiceBlockingStub build(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      return new UserProfileServiceBlockingStub(channel, callOptions);
    }

    /**
     */
    public com.aiplatform.profile.proto.UserProfileResponse getMyProfile(com.aiplatform.profile.proto.GetMyProfileRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getGetMyProfileMethod(), getCallOptions(), request);
    }

    /**
     */
    public com.aiplatform.profile.proto.UserProfileResponse getProfileById(com.aiplatform.profile.proto.GetProfileRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getGetProfileByIdMethod(), getCallOptions(), request);
    }

    /**
     */
    public com.aiplatform.profile.proto.UserProfileResponse updateMyProfile(com.aiplatform.profile.proto.UpdateProfileRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getUpdateMyProfileMethod(), getCallOptions(), request);
    }

    /**
     */
    public com.aiplatform.profile.proto.SearchProfilesResponse searchProfiles(com.aiplatform.profile.proto.SearchProfilesRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getSearchProfilesMethod(), getCallOptions(), request);
    }

    /**
     */
    public com.aiplatform.profile.proto.SimpleResponse updateProfileVisibility(com.aiplatform.profile.proto.UpdateVisibilityRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getUpdateProfileVisibilityMethod(), getCallOptions(), request);
    }

    /**
     */
    public com.aiplatform.profile.proto.SimpleResponse incrementReputation(com.aiplatform.profile.proto.IncrementReputationRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getIncrementReputationMethod(), getCallOptions(), request);
    }
  }

  /**
   * A stub to allow clients to do ListenableFuture-style rpc calls to service UserProfileService.
   */
  public static final class UserProfileServiceFutureStub
      extends io.grpc.stub.AbstractFutureStub<UserProfileServiceFutureStub> {
    private UserProfileServiceFutureStub(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      super(channel, callOptions);
    }

    @java.lang.Override
    protected UserProfileServiceFutureStub build(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      return new UserProfileServiceFutureStub(channel, callOptions);
    }

    /**
     */
    public com.google.common.util.concurrent.ListenableFuture<com.aiplatform.profile.proto.UserProfileResponse> getMyProfile(
        com.aiplatform.profile.proto.GetMyProfileRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getGetMyProfileMethod(), getCallOptions()), request);
    }

    /**
     */
    public com.google.common.util.concurrent.ListenableFuture<com.aiplatform.profile.proto.UserProfileResponse> getProfileById(
        com.aiplatform.profile.proto.GetProfileRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getGetProfileByIdMethod(), getCallOptions()), request);
    }

    /**
     */
    public com.google.common.util.concurrent.ListenableFuture<com.aiplatform.profile.proto.UserProfileResponse> updateMyProfile(
        com.aiplatform.profile.proto.UpdateProfileRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getUpdateMyProfileMethod(), getCallOptions()), request);
    }

    /**
     */
    public com.google.common.util.concurrent.ListenableFuture<com.aiplatform.profile.proto.SearchProfilesResponse> searchProfiles(
        com.aiplatform.profile.proto.SearchProfilesRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getSearchProfilesMethod(), getCallOptions()), request);
    }

    /**
     */
    public com.google.common.util.concurrent.ListenableFuture<com.aiplatform.profile.proto.SimpleResponse> updateProfileVisibility(
        com.aiplatform.profile.proto.UpdateVisibilityRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getUpdateProfileVisibilityMethod(), getCallOptions()), request);
    }

    /**
     */
    public com.google.common.util.concurrent.ListenableFuture<com.aiplatform.profile.proto.SimpleResponse> incrementReputation(
        com.aiplatform.profile.proto.IncrementReputationRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getIncrementReputationMethod(), getCallOptions()), request);
    }
  }

  private static final int METHODID_GET_MY_PROFILE = 0;
  private static final int METHODID_GET_PROFILE_BY_ID = 1;
  private static final int METHODID_UPDATE_MY_PROFILE = 2;
  private static final int METHODID_SEARCH_PROFILES = 3;
  private static final int METHODID_UPDATE_PROFILE_VISIBILITY = 4;
  private static final int METHODID_INCREMENT_REPUTATION = 5;

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
        case METHODID_GET_MY_PROFILE:
          serviceImpl.getMyProfile((com.aiplatform.profile.proto.GetMyProfileRequest) request,
              (io.grpc.stub.StreamObserver<com.aiplatform.profile.proto.UserProfileResponse>) responseObserver);
          break;
        case METHODID_GET_PROFILE_BY_ID:
          serviceImpl.getProfileById((com.aiplatform.profile.proto.GetProfileRequest) request,
              (io.grpc.stub.StreamObserver<com.aiplatform.profile.proto.UserProfileResponse>) responseObserver);
          break;
        case METHODID_UPDATE_MY_PROFILE:
          serviceImpl.updateMyProfile((com.aiplatform.profile.proto.UpdateProfileRequest) request,
              (io.grpc.stub.StreamObserver<com.aiplatform.profile.proto.UserProfileResponse>) responseObserver);
          break;
        case METHODID_SEARCH_PROFILES:
          serviceImpl.searchProfiles((com.aiplatform.profile.proto.SearchProfilesRequest) request,
              (io.grpc.stub.StreamObserver<com.aiplatform.profile.proto.SearchProfilesResponse>) responseObserver);
          break;
        case METHODID_UPDATE_PROFILE_VISIBILITY:
          serviceImpl.updateProfileVisibility((com.aiplatform.profile.proto.UpdateVisibilityRequest) request,
              (io.grpc.stub.StreamObserver<com.aiplatform.profile.proto.SimpleResponse>) responseObserver);
          break;
        case METHODID_INCREMENT_REPUTATION:
          serviceImpl.incrementReputation((com.aiplatform.profile.proto.IncrementReputationRequest) request,
              (io.grpc.stub.StreamObserver<com.aiplatform.profile.proto.SimpleResponse>) responseObserver);
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
          getGetMyProfileMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.aiplatform.profile.proto.GetMyProfileRequest,
              com.aiplatform.profile.proto.UserProfileResponse>(
                service, METHODID_GET_MY_PROFILE)))
        .addMethod(
          getGetProfileByIdMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.aiplatform.profile.proto.GetProfileRequest,
              com.aiplatform.profile.proto.UserProfileResponse>(
                service, METHODID_GET_PROFILE_BY_ID)))
        .addMethod(
          getUpdateMyProfileMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.aiplatform.profile.proto.UpdateProfileRequest,
              com.aiplatform.profile.proto.UserProfileResponse>(
                service, METHODID_UPDATE_MY_PROFILE)))
        .addMethod(
          getSearchProfilesMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.aiplatform.profile.proto.SearchProfilesRequest,
              com.aiplatform.profile.proto.SearchProfilesResponse>(
                service, METHODID_SEARCH_PROFILES)))
        .addMethod(
          getUpdateProfileVisibilityMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.aiplatform.profile.proto.UpdateVisibilityRequest,
              com.aiplatform.profile.proto.SimpleResponse>(
                service, METHODID_UPDATE_PROFILE_VISIBILITY)))
        .addMethod(
          getIncrementReputationMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.aiplatform.profile.proto.IncrementReputationRequest,
              com.aiplatform.profile.proto.SimpleResponse>(
                service, METHODID_INCREMENT_REPUTATION)))
        .build();
  }

  private static abstract class UserProfileServiceBaseDescriptorSupplier
      implements io.grpc.protobuf.ProtoFileDescriptorSupplier, io.grpc.protobuf.ProtoServiceDescriptorSupplier {
    UserProfileServiceBaseDescriptorSupplier() {}

    @java.lang.Override
    public com.google.protobuf.Descriptors.FileDescriptor getFileDescriptor() {
      return com.aiplatform.profile.proto.ProfileProto.getDescriptor();
    }

    @java.lang.Override
    public com.google.protobuf.Descriptors.ServiceDescriptor getServiceDescriptor() {
      return getFileDescriptor().findServiceByName("UserProfileService");
    }
  }

  private static final class UserProfileServiceFileDescriptorSupplier
      extends UserProfileServiceBaseDescriptorSupplier {
    UserProfileServiceFileDescriptorSupplier() {}
  }

  private static final class UserProfileServiceMethodDescriptorSupplier
      extends UserProfileServiceBaseDescriptorSupplier
      implements io.grpc.protobuf.ProtoMethodDescriptorSupplier {
    private final java.lang.String methodName;

    UserProfileServiceMethodDescriptorSupplier(java.lang.String methodName) {
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
      synchronized (UserProfileServiceGrpc.class) {
        result = serviceDescriptor;
        if (result == null) {
          serviceDescriptor = result = io.grpc.ServiceDescriptor.newBuilder(SERVICE_NAME)
              .setSchemaDescriptor(new UserProfileServiceFileDescriptorSupplier())
              .addMethod(getGetMyProfileMethod())
              .addMethod(getGetProfileByIdMethod())
              .addMethod(getUpdateMyProfileMethod())
              .addMethod(getSearchProfilesMethod())
              .addMethod(getUpdateProfileVisibilityMethod())
              .addMethod(getIncrementReputationMethod())
              .build();
        }
      }
    }
    return result;
  }
}
