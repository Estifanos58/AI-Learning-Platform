package com.aiplatform.chat.proto;

import static io.grpc.MethodDescriptor.generateFullMethodName;

/**
 */
@javax.annotation.Generated(
    value = "by gRPC proto compiler (version 1.69.0)",
    comments = "Source: chat.proto")
@io.grpc.stub.annotations.GrpcGenerated
public final class ChatServiceGrpc {

  private ChatServiceGrpc() {}

  public static final java.lang.String SERVICE_NAME = "chat.v1.ChatService";

  // Static method descriptors that strictly reflect the proto.
  private static volatile io.grpc.MethodDescriptor<com.aiplatform.chat.proto.SendMessageRequest,
      com.aiplatform.chat.proto.SendMessageResponse> getSendMessageMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "SendMessage",
      requestType = com.aiplatform.chat.proto.SendMessageRequest.class,
      responseType = com.aiplatform.chat.proto.SendMessageResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.aiplatform.chat.proto.SendMessageRequest,
      com.aiplatform.chat.proto.SendMessageResponse> getSendMessageMethod() {
    io.grpc.MethodDescriptor<com.aiplatform.chat.proto.SendMessageRequest, com.aiplatform.chat.proto.SendMessageResponse> getSendMessageMethod;
    if ((getSendMessageMethod = ChatServiceGrpc.getSendMessageMethod) == null) {
      synchronized (ChatServiceGrpc.class) {
        if ((getSendMessageMethod = ChatServiceGrpc.getSendMessageMethod) == null) {
          ChatServiceGrpc.getSendMessageMethod = getSendMessageMethod =
              io.grpc.MethodDescriptor.<com.aiplatform.chat.proto.SendMessageRequest, com.aiplatform.chat.proto.SendMessageResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "SendMessage"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.chat.proto.SendMessageRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.chat.proto.SendMessageResponse.getDefaultInstance()))
              .setSchemaDescriptor(new ChatServiceMethodDescriptorSupplier("SendMessage"))
              .build();
        }
      }
    }
    return getSendMessageMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.aiplatform.chat.proto.GetChatroomRequest,
      com.aiplatform.chat.proto.ChatroomResponse> getGetChatroomMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "GetChatroom",
      requestType = com.aiplatform.chat.proto.GetChatroomRequest.class,
      responseType = com.aiplatform.chat.proto.ChatroomResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.aiplatform.chat.proto.GetChatroomRequest,
      com.aiplatform.chat.proto.ChatroomResponse> getGetChatroomMethod() {
    io.grpc.MethodDescriptor<com.aiplatform.chat.proto.GetChatroomRequest, com.aiplatform.chat.proto.ChatroomResponse> getGetChatroomMethod;
    if ((getGetChatroomMethod = ChatServiceGrpc.getGetChatroomMethod) == null) {
      synchronized (ChatServiceGrpc.class) {
        if ((getGetChatroomMethod = ChatServiceGrpc.getGetChatroomMethod) == null) {
          ChatServiceGrpc.getGetChatroomMethod = getGetChatroomMethod =
              io.grpc.MethodDescriptor.<com.aiplatform.chat.proto.GetChatroomRequest, com.aiplatform.chat.proto.ChatroomResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "GetChatroom"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.chat.proto.GetChatroomRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.chat.proto.ChatroomResponse.getDefaultInstance()))
              .setSchemaDescriptor(new ChatServiceMethodDescriptorSupplier("GetChatroom"))
              .build();
        }
      }
    }
    return getGetChatroomMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.aiplatform.chat.proto.ListChatroomsRequest,
      com.aiplatform.chat.proto.ListChatroomsResponse> getListChatroomsMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "ListChatrooms",
      requestType = com.aiplatform.chat.proto.ListChatroomsRequest.class,
      responseType = com.aiplatform.chat.proto.ListChatroomsResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.aiplatform.chat.proto.ListChatroomsRequest,
      com.aiplatform.chat.proto.ListChatroomsResponse> getListChatroomsMethod() {
    io.grpc.MethodDescriptor<com.aiplatform.chat.proto.ListChatroomsRequest, com.aiplatform.chat.proto.ListChatroomsResponse> getListChatroomsMethod;
    if ((getListChatroomsMethod = ChatServiceGrpc.getListChatroomsMethod) == null) {
      synchronized (ChatServiceGrpc.class) {
        if ((getListChatroomsMethod = ChatServiceGrpc.getListChatroomsMethod) == null) {
          ChatServiceGrpc.getListChatroomsMethod = getListChatroomsMethod =
              io.grpc.MethodDescriptor.<com.aiplatform.chat.proto.ListChatroomsRequest, com.aiplatform.chat.proto.ListChatroomsResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "ListChatrooms"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.chat.proto.ListChatroomsRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.chat.proto.ListChatroomsResponse.getDefaultInstance()))
              .setSchemaDescriptor(new ChatServiceMethodDescriptorSupplier("ListChatrooms"))
              .build();
        }
      }
    }
    return getListChatroomsMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.aiplatform.chat.proto.ListMessagesRequest,
      com.aiplatform.chat.proto.ListMessagesResponse> getListMessagesMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "ListMessages",
      requestType = com.aiplatform.chat.proto.ListMessagesRequest.class,
      responseType = com.aiplatform.chat.proto.ListMessagesResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.aiplatform.chat.proto.ListMessagesRequest,
      com.aiplatform.chat.proto.ListMessagesResponse> getListMessagesMethod() {
    io.grpc.MethodDescriptor<com.aiplatform.chat.proto.ListMessagesRequest, com.aiplatform.chat.proto.ListMessagesResponse> getListMessagesMethod;
    if ((getListMessagesMethod = ChatServiceGrpc.getListMessagesMethod) == null) {
      synchronized (ChatServiceGrpc.class) {
        if ((getListMessagesMethod = ChatServiceGrpc.getListMessagesMethod) == null) {
          ChatServiceGrpc.getListMessagesMethod = getListMessagesMethod =
              io.grpc.MethodDescriptor.<com.aiplatform.chat.proto.ListMessagesRequest, com.aiplatform.chat.proto.ListMessagesResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "ListMessages"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.chat.proto.ListMessagesRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.chat.proto.ListMessagesResponse.getDefaultInstance()))
              .setSchemaDescriptor(new ChatServiceMethodDescriptorSupplier("ListMessages"))
              .build();
        }
      }
    }
    return getListMessagesMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.aiplatform.chat.proto.TypingIndicatorRequest,
      com.aiplatform.chat.proto.SimpleResponse> getSendTypingIndicatorMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "SendTypingIndicator",
      requestType = com.aiplatform.chat.proto.TypingIndicatorRequest.class,
      responseType = com.aiplatform.chat.proto.SimpleResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.aiplatform.chat.proto.TypingIndicatorRequest,
      com.aiplatform.chat.proto.SimpleResponse> getSendTypingIndicatorMethod() {
    io.grpc.MethodDescriptor<com.aiplatform.chat.proto.TypingIndicatorRequest, com.aiplatform.chat.proto.SimpleResponse> getSendTypingIndicatorMethod;
    if ((getSendTypingIndicatorMethod = ChatServiceGrpc.getSendTypingIndicatorMethod) == null) {
      synchronized (ChatServiceGrpc.class) {
        if ((getSendTypingIndicatorMethod = ChatServiceGrpc.getSendTypingIndicatorMethod) == null) {
          ChatServiceGrpc.getSendTypingIndicatorMethod = getSendTypingIndicatorMethod =
              io.grpc.MethodDescriptor.<com.aiplatform.chat.proto.TypingIndicatorRequest, com.aiplatform.chat.proto.SimpleResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "SendTypingIndicator"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.chat.proto.TypingIndicatorRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.chat.proto.SimpleResponse.getDefaultInstance()))
              .setSchemaDescriptor(new ChatServiceMethodDescriptorSupplier("SendTypingIndicator"))
              .build();
        }
      }
    }
    return getSendTypingIndicatorMethod;
  }

  /**
   * Creates a new async stub that supports all call types for the service
   */
  public static ChatServiceStub newStub(io.grpc.Channel channel) {
    io.grpc.stub.AbstractStub.StubFactory<ChatServiceStub> factory =
      new io.grpc.stub.AbstractStub.StubFactory<ChatServiceStub>() {
        @java.lang.Override
        public ChatServiceStub newStub(io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
          return new ChatServiceStub(channel, callOptions);
        }
      };
    return ChatServiceStub.newStub(factory, channel);
  }

  /**
   * Creates a new blocking-style stub that supports unary and streaming output calls on the service
   */
  public static ChatServiceBlockingStub newBlockingStub(
      io.grpc.Channel channel) {
    io.grpc.stub.AbstractStub.StubFactory<ChatServiceBlockingStub> factory =
      new io.grpc.stub.AbstractStub.StubFactory<ChatServiceBlockingStub>() {
        @java.lang.Override
        public ChatServiceBlockingStub newStub(io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
          return new ChatServiceBlockingStub(channel, callOptions);
        }
      };
    return ChatServiceBlockingStub.newStub(factory, channel);
  }

  /**
   * Creates a new ListenableFuture-style stub that supports unary calls on the service
   */
  public static ChatServiceFutureStub newFutureStub(
      io.grpc.Channel channel) {
    io.grpc.stub.AbstractStub.StubFactory<ChatServiceFutureStub> factory =
      new io.grpc.stub.AbstractStub.StubFactory<ChatServiceFutureStub>() {
        @java.lang.Override
        public ChatServiceFutureStub newStub(io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
          return new ChatServiceFutureStub(channel, callOptions);
        }
      };
    return ChatServiceFutureStub.newStub(factory, channel);
  }

  /**
   */
  public interface AsyncService {

    /**
     */
    default void sendMessage(com.aiplatform.chat.proto.SendMessageRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.chat.proto.SendMessageResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getSendMessageMethod(), responseObserver);
    }

    /**
     */
    default void getChatroom(com.aiplatform.chat.proto.GetChatroomRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.chat.proto.ChatroomResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getGetChatroomMethod(), responseObserver);
    }

    /**
     */
    default void listChatrooms(com.aiplatform.chat.proto.ListChatroomsRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.chat.proto.ListChatroomsResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getListChatroomsMethod(), responseObserver);
    }

    /**
     */
    default void listMessages(com.aiplatform.chat.proto.ListMessagesRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.chat.proto.ListMessagesResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getListMessagesMethod(), responseObserver);
    }

    /**
     */
    default void sendTypingIndicator(com.aiplatform.chat.proto.TypingIndicatorRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.chat.proto.SimpleResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getSendTypingIndicatorMethod(), responseObserver);
    }
  }

  /**
   * Base class for the server implementation of the service ChatService.
   */
  public static abstract class ChatServiceImplBase
      implements io.grpc.BindableService, AsyncService {

    @java.lang.Override public final io.grpc.ServerServiceDefinition bindService() {
      return ChatServiceGrpc.bindService(this);
    }
  }

  /**
   * A stub to allow clients to do asynchronous rpc calls to service ChatService.
   */
  public static final class ChatServiceStub
      extends io.grpc.stub.AbstractAsyncStub<ChatServiceStub> {
    private ChatServiceStub(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      super(channel, callOptions);
    }

    @java.lang.Override
    protected ChatServiceStub build(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      return new ChatServiceStub(channel, callOptions);
    }

    /**
     */
    public void sendMessage(com.aiplatform.chat.proto.SendMessageRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.chat.proto.SendMessageResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getSendMessageMethod(), getCallOptions()), request, responseObserver);
    }

    /**
     */
    public void getChatroom(com.aiplatform.chat.proto.GetChatroomRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.chat.proto.ChatroomResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getGetChatroomMethod(), getCallOptions()), request, responseObserver);
    }

    /**
     */
    public void listChatrooms(com.aiplatform.chat.proto.ListChatroomsRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.chat.proto.ListChatroomsResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getListChatroomsMethod(), getCallOptions()), request, responseObserver);
    }

    /**
     */
    public void listMessages(com.aiplatform.chat.proto.ListMessagesRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.chat.proto.ListMessagesResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getListMessagesMethod(), getCallOptions()), request, responseObserver);
    }

    /**
     */
    public void sendTypingIndicator(com.aiplatform.chat.proto.TypingIndicatorRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.chat.proto.SimpleResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getSendTypingIndicatorMethod(), getCallOptions()), request, responseObserver);
    }
  }

  /**
   * A stub to allow clients to do synchronous rpc calls to service ChatService.
   */
  public static final class ChatServiceBlockingStub
      extends io.grpc.stub.AbstractBlockingStub<ChatServiceBlockingStub> {
    private ChatServiceBlockingStub(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      super(channel, callOptions);
    }

    @java.lang.Override
    protected ChatServiceBlockingStub build(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      return new ChatServiceBlockingStub(channel, callOptions);
    }

    /**
     */
    public com.aiplatform.chat.proto.SendMessageResponse sendMessage(com.aiplatform.chat.proto.SendMessageRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getSendMessageMethod(), getCallOptions(), request);
    }

    /**
     */
    public com.aiplatform.chat.proto.ChatroomResponse getChatroom(com.aiplatform.chat.proto.GetChatroomRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getGetChatroomMethod(), getCallOptions(), request);
    }

    /**
     */
    public com.aiplatform.chat.proto.ListChatroomsResponse listChatrooms(com.aiplatform.chat.proto.ListChatroomsRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getListChatroomsMethod(), getCallOptions(), request);
    }

    /**
     */
    public com.aiplatform.chat.proto.ListMessagesResponse listMessages(com.aiplatform.chat.proto.ListMessagesRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getListMessagesMethod(), getCallOptions(), request);
    }

    /**
     */
    public com.aiplatform.chat.proto.SimpleResponse sendTypingIndicator(com.aiplatform.chat.proto.TypingIndicatorRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getSendTypingIndicatorMethod(), getCallOptions(), request);
    }
  }

  /**
   * A stub to allow clients to do ListenableFuture-style rpc calls to service ChatService.
   */
  public static final class ChatServiceFutureStub
      extends io.grpc.stub.AbstractFutureStub<ChatServiceFutureStub> {
    private ChatServiceFutureStub(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      super(channel, callOptions);
    }

    @java.lang.Override
    protected ChatServiceFutureStub build(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      return new ChatServiceFutureStub(channel, callOptions);
    }

    /**
     */
    public com.google.common.util.concurrent.ListenableFuture<com.aiplatform.chat.proto.SendMessageResponse> sendMessage(
        com.aiplatform.chat.proto.SendMessageRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getSendMessageMethod(), getCallOptions()), request);
    }

    /**
     */
    public com.google.common.util.concurrent.ListenableFuture<com.aiplatform.chat.proto.ChatroomResponse> getChatroom(
        com.aiplatform.chat.proto.GetChatroomRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getGetChatroomMethod(), getCallOptions()), request);
    }

    /**
     */
    public com.google.common.util.concurrent.ListenableFuture<com.aiplatform.chat.proto.ListChatroomsResponse> listChatrooms(
        com.aiplatform.chat.proto.ListChatroomsRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getListChatroomsMethod(), getCallOptions()), request);
    }

    /**
     */
    public com.google.common.util.concurrent.ListenableFuture<com.aiplatform.chat.proto.ListMessagesResponse> listMessages(
        com.aiplatform.chat.proto.ListMessagesRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getListMessagesMethod(), getCallOptions()), request);
    }

    /**
     */
    public com.google.common.util.concurrent.ListenableFuture<com.aiplatform.chat.proto.SimpleResponse> sendTypingIndicator(
        com.aiplatform.chat.proto.TypingIndicatorRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getSendTypingIndicatorMethod(), getCallOptions()), request);
    }
  }

  private static final int METHODID_SEND_MESSAGE = 0;
  private static final int METHODID_GET_CHATROOM = 1;
  private static final int METHODID_LIST_CHATROOMS = 2;
  private static final int METHODID_LIST_MESSAGES = 3;
  private static final int METHODID_SEND_TYPING_INDICATOR = 4;

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
        case METHODID_SEND_MESSAGE:
          serviceImpl.sendMessage((com.aiplatform.chat.proto.SendMessageRequest) request,
              (io.grpc.stub.StreamObserver<com.aiplatform.chat.proto.SendMessageResponse>) responseObserver);
          break;
        case METHODID_GET_CHATROOM:
          serviceImpl.getChatroom((com.aiplatform.chat.proto.GetChatroomRequest) request,
              (io.grpc.stub.StreamObserver<com.aiplatform.chat.proto.ChatroomResponse>) responseObserver);
          break;
        case METHODID_LIST_CHATROOMS:
          serviceImpl.listChatrooms((com.aiplatform.chat.proto.ListChatroomsRequest) request,
              (io.grpc.stub.StreamObserver<com.aiplatform.chat.proto.ListChatroomsResponse>) responseObserver);
          break;
        case METHODID_LIST_MESSAGES:
          serviceImpl.listMessages((com.aiplatform.chat.proto.ListMessagesRequest) request,
              (io.grpc.stub.StreamObserver<com.aiplatform.chat.proto.ListMessagesResponse>) responseObserver);
          break;
        case METHODID_SEND_TYPING_INDICATOR:
          serviceImpl.sendTypingIndicator((com.aiplatform.chat.proto.TypingIndicatorRequest) request,
              (io.grpc.stub.StreamObserver<com.aiplatform.chat.proto.SimpleResponse>) responseObserver);
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
          getSendMessageMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.aiplatform.chat.proto.SendMessageRequest,
              com.aiplatform.chat.proto.SendMessageResponse>(
                service, METHODID_SEND_MESSAGE)))
        .addMethod(
          getGetChatroomMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.aiplatform.chat.proto.GetChatroomRequest,
              com.aiplatform.chat.proto.ChatroomResponse>(
                service, METHODID_GET_CHATROOM)))
        .addMethod(
          getListChatroomsMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.aiplatform.chat.proto.ListChatroomsRequest,
              com.aiplatform.chat.proto.ListChatroomsResponse>(
                service, METHODID_LIST_CHATROOMS)))
        .addMethod(
          getListMessagesMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.aiplatform.chat.proto.ListMessagesRequest,
              com.aiplatform.chat.proto.ListMessagesResponse>(
                service, METHODID_LIST_MESSAGES)))
        .addMethod(
          getSendTypingIndicatorMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.aiplatform.chat.proto.TypingIndicatorRequest,
              com.aiplatform.chat.proto.SimpleResponse>(
                service, METHODID_SEND_TYPING_INDICATOR)))
        .build();
  }

  private static abstract class ChatServiceBaseDescriptorSupplier
      implements io.grpc.protobuf.ProtoFileDescriptorSupplier, io.grpc.protobuf.ProtoServiceDescriptorSupplier {
    ChatServiceBaseDescriptorSupplier() {}

    @java.lang.Override
    public com.google.protobuf.Descriptors.FileDescriptor getFileDescriptor() {
      return com.aiplatform.chat.proto.ChatProto.getDescriptor();
    }

    @java.lang.Override
    public com.google.protobuf.Descriptors.ServiceDescriptor getServiceDescriptor() {
      return getFileDescriptor().findServiceByName("ChatService");
    }
  }

  private static final class ChatServiceFileDescriptorSupplier
      extends ChatServiceBaseDescriptorSupplier {
    ChatServiceFileDescriptorSupplier() {}
  }

  private static final class ChatServiceMethodDescriptorSupplier
      extends ChatServiceBaseDescriptorSupplier
      implements io.grpc.protobuf.ProtoMethodDescriptorSupplier {
    private final java.lang.String methodName;

    ChatServiceMethodDescriptorSupplier(java.lang.String methodName) {
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
      synchronized (ChatServiceGrpc.class) {
        result = serviceDescriptor;
        if (result == null) {
          serviceDescriptor = result = io.grpc.ServiceDescriptor.newBuilder(SERVICE_NAME)
              .setSchemaDescriptor(new ChatServiceFileDescriptorSupplier())
              .addMethod(getSendMessageMethod())
              .addMethod(getGetChatroomMethod())
              .addMethod(getListChatroomsMethod())
              .addMethod(getListMessagesMethod())
              .addMethod(getSendTypingIndicatorMethod())
              .build();
        }
      }
    }
    return result;
  }
}
