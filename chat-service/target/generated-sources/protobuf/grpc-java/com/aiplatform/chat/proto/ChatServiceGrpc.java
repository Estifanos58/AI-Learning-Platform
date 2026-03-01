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
  private static volatile io.grpc.MethodDescriptor<com.aiplatform.chat.proto.CreateDirectChatRequest,
      com.aiplatform.chat.proto.ChatroomResponse> getCreateOrGetDirectChatMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "CreateOrGetDirectChat",
      requestType = com.aiplatform.chat.proto.CreateDirectChatRequest.class,
      responseType = com.aiplatform.chat.proto.ChatroomResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.aiplatform.chat.proto.CreateDirectChatRequest,
      com.aiplatform.chat.proto.ChatroomResponse> getCreateOrGetDirectChatMethod() {
    io.grpc.MethodDescriptor<com.aiplatform.chat.proto.CreateDirectChatRequest, com.aiplatform.chat.proto.ChatroomResponse> getCreateOrGetDirectChatMethod;
    if ((getCreateOrGetDirectChatMethod = ChatServiceGrpc.getCreateOrGetDirectChatMethod) == null) {
      synchronized (ChatServiceGrpc.class) {
        if ((getCreateOrGetDirectChatMethod = ChatServiceGrpc.getCreateOrGetDirectChatMethod) == null) {
          ChatServiceGrpc.getCreateOrGetDirectChatMethod = getCreateOrGetDirectChatMethod =
              io.grpc.MethodDescriptor.<com.aiplatform.chat.proto.CreateDirectChatRequest, com.aiplatform.chat.proto.ChatroomResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "CreateOrGetDirectChat"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.chat.proto.CreateDirectChatRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.chat.proto.ChatroomResponse.getDefaultInstance()))
              .setSchemaDescriptor(new ChatServiceMethodDescriptorSupplier("CreateOrGetDirectChat"))
              .build();
        }
      }
    }
    return getCreateOrGetDirectChatMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.aiplatform.chat.proto.CreateGroupChatRequest,
      com.aiplatform.chat.proto.ChatroomResponse> getCreateGroupChatMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "CreateGroupChat",
      requestType = com.aiplatform.chat.proto.CreateGroupChatRequest.class,
      responseType = com.aiplatform.chat.proto.ChatroomResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.aiplatform.chat.proto.CreateGroupChatRequest,
      com.aiplatform.chat.proto.ChatroomResponse> getCreateGroupChatMethod() {
    io.grpc.MethodDescriptor<com.aiplatform.chat.proto.CreateGroupChatRequest, com.aiplatform.chat.proto.ChatroomResponse> getCreateGroupChatMethod;
    if ((getCreateGroupChatMethod = ChatServiceGrpc.getCreateGroupChatMethod) == null) {
      synchronized (ChatServiceGrpc.class) {
        if ((getCreateGroupChatMethod = ChatServiceGrpc.getCreateGroupChatMethod) == null) {
          ChatServiceGrpc.getCreateGroupChatMethod = getCreateGroupChatMethod =
              io.grpc.MethodDescriptor.<com.aiplatform.chat.proto.CreateGroupChatRequest, com.aiplatform.chat.proto.ChatroomResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "CreateGroupChat"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.chat.proto.CreateGroupChatRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.chat.proto.ChatroomResponse.getDefaultInstance()))
              .setSchemaDescriptor(new ChatServiceMethodDescriptorSupplier("CreateGroupChat"))
              .build();
        }
      }
    }
    return getCreateGroupChatMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.aiplatform.chat.proto.SendMessageRequest,
      com.aiplatform.chat.proto.MessageResponse> getSendMessageMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "SendMessage",
      requestType = com.aiplatform.chat.proto.SendMessageRequest.class,
      responseType = com.aiplatform.chat.proto.MessageResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.aiplatform.chat.proto.SendMessageRequest,
      com.aiplatform.chat.proto.MessageResponse> getSendMessageMethod() {
    io.grpc.MethodDescriptor<com.aiplatform.chat.proto.SendMessageRequest, com.aiplatform.chat.proto.MessageResponse> getSendMessageMethod;
    if ((getSendMessageMethod = ChatServiceGrpc.getSendMessageMethod) == null) {
      synchronized (ChatServiceGrpc.class) {
        if ((getSendMessageMethod = ChatServiceGrpc.getSendMessageMethod) == null) {
          ChatServiceGrpc.getSendMessageMethod = getSendMessageMethod =
              io.grpc.MethodDescriptor.<com.aiplatform.chat.proto.SendMessageRequest, com.aiplatform.chat.proto.MessageResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "SendMessage"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.chat.proto.SendMessageRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.chat.proto.MessageResponse.getDefaultInstance()))
              .setSchemaDescriptor(new ChatServiceMethodDescriptorSupplier("SendMessage"))
              .build();
        }
      }
    }
    return getSendMessageMethod;
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

  private static volatile io.grpc.MethodDescriptor<com.aiplatform.chat.proto.AddMemberRequest,
      com.aiplatform.chat.proto.SimpleResponse> getAddMemberMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "AddMember",
      requestType = com.aiplatform.chat.proto.AddMemberRequest.class,
      responseType = com.aiplatform.chat.proto.SimpleResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.aiplatform.chat.proto.AddMemberRequest,
      com.aiplatform.chat.proto.SimpleResponse> getAddMemberMethod() {
    io.grpc.MethodDescriptor<com.aiplatform.chat.proto.AddMemberRequest, com.aiplatform.chat.proto.SimpleResponse> getAddMemberMethod;
    if ((getAddMemberMethod = ChatServiceGrpc.getAddMemberMethod) == null) {
      synchronized (ChatServiceGrpc.class) {
        if ((getAddMemberMethod = ChatServiceGrpc.getAddMemberMethod) == null) {
          ChatServiceGrpc.getAddMemberMethod = getAddMemberMethod =
              io.grpc.MethodDescriptor.<com.aiplatform.chat.proto.AddMemberRequest, com.aiplatform.chat.proto.SimpleResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "AddMember"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.chat.proto.AddMemberRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.chat.proto.SimpleResponse.getDefaultInstance()))
              .setSchemaDescriptor(new ChatServiceMethodDescriptorSupplier("AddMember"))
              .build();
        }
      }
    }
    return getAddMemberMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.aiplatform.chat.proto.RemoveMemberRequest,
      com.aiplatform.chat.proto.SimpleResponse> getRemoveMemberMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "RemoveMember",
      requestType = com.aiplatform.chat.proto.RemoveMemberRequest.class,
      responseType = com.aiplatform.chat.proto.SimpleResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.aiplatform.chat.proto.RemoveMemberRequest,
      com.aiplatform.chat.proto.SimpleResponse> getRemoveMemberMethod() {
    io.grpc.MethodDescriptor<com.aiplatform.chat.proto.RemoveMemberRequest, com.aiplatform.chat.proto.SimpleResponse> getRemoveMemberMethod;
    if ((getRemoveMemberMethod = ChatServiceGrpc.getRemoveMemberMethod) == null) {
      synchronized (ChatServiceGrpc.class) {
        if ((getRemoveMemberMethod = ChatServiceGrpc.getRemoveMemberMethod) == null) {
          ChatServiceGrpc.getRemoveMemberMethod = getRemoveMemberMethod =
              io.grpc.MethodDescriptor.<com.aiplatform.chat.proto.RemoveMemberRequest, com.aiplatform.chat.proto.SimpleResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "RemoveMember"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.chat.proto.RemoveMemberRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.chat.proto.SimpleResponse.getDefaultInstance()))
              .setSchemaDescriptor(new ChatServiceMethodDescriptorSupplier("RemoveMember"))
              .build();
        }
      }
    }
    return getRemoveMemberMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.aiplatform.chat.proto.MarkAsReadRequest,
      com.aiplatform.chat.proto.SimpleResponse> getMarkAsReadMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "MarkAsRead",
      requestType = com.aiplatform.chat.proto.MarkAsReadRequest.class,
      responseType = com.aiplatform.chat.proto.SimpleResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.aiplatform.chat.proto.MarkAsReadRequest,
      com.aiplatform.chat.proto.SimpleResponse> getMarkAsReadMethod() {
    io.grpc.MethodDescriptor<com.aiplatform.chat.proto.MarkAsReadRequest, com.aiplatform.chat.proto.SimpleResponse> getMarkAsReadMethod;
    if ((getMarkAsReadMethod = ChatServiceGrpc.getMarkAsReadMethod) == null) {
      synchronized (ChatServiceGrpc.class) {
        if ((getMarkAsReadMethod = ChatServiceGrpc.getMarkAsReadMethod) == null) {
          ChatServiceGrpc.getMarkAsReadMethod = getMarkAsReadMethod =
              io.grpc.MethodDescriptor.<com.aiplatform.chat.proto.MarkAsReadRequest, com.aiplatform.chat.proto.SimpleResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "MarkAsRead"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.chat.proto.MarkAsReadRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.chat.proto.SimpleResponse.getDefaultInstance()))
              .setSchemaDescriptor(new ChatServiceMethodDescriptorSupplier("MarkAsRead"))
              .build();
        }
      }
    }
    return getMarkAsReadMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.aiplatform.chat.proto.GetMyChatroomsRequest,
      com.aiplatform.chat.proto.ListChatroomsResponse> getGetMyChatroomsMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "GetMyChatrooms",
      requestType = com.aiplatform.chat.proto.GetMyChatroomsRequest.class,
      responseType = com.aiplatform.chat.proto.ListChatroomsResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.aiplatform.chat.proto.GetMyChatroomsRequest,
      com.aiplatform.chat.proto.ListChatroomsResponse> getGetMyChatroomsMethod() {
    io.grpc.MethodDescriptor<com.aiplatform.chat.proto.GetMyChatroomsRequest, com.aiplatform.chat.proto.ListChatroomsResponse> getGetMyChatroomsMethod;
    if ((getGetMyChatroomsMethod = ChatServiceGrpc.getGetMyChatroomsMethod) == null) {
      synchronized (ChatServiceGrpc.class) {
        if ((getGetMyChatroomsMethod = ChatServiceGrpc.getGetMyChatroomsMethod) == null) {
          ChatServiceGrpc.getGetMyChatroomsMethod = getGetMyChatroomsMethod =
              io.grpc.MethodDescriptor.<com.aiplatform.chat.proto.GetMyChatroomsRequest, com.aiplatform.chat.proto.ListChatroomsResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "GetMyChatrooms"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.chat.proto.GetMyChatroomsRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.chat.proto.ListChatroomsResponse.getDefaultInstance()))
              .setSchemaDescriptor(new ChatServiceMethodDescriptorSupplier("GetMyChatrooms"))
              .build();
        }
      }
    }
    return getGetMyChatroomsMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.aiplatform.chat.proto.AddAiModelRequest,
      com.aiplatform.chat.proto.SimpleResponse> getAddAiModelToChatMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "AddAiModelToChat",
      requestType = com.aiplatform.chat.proto.AddAiModelRequest.class,
      responseType = com.aiplatform.chat.proto.SimpleResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.aiplatform.chat.proto.AddAiModelRequest,
      com.aiplatform.chat.proto.SimpleResponse> getAddAiModelToChatMethod() {
    io.grpc.MethodDescriptor<com.aiplatform.chat.proto.AddAiModelRequest, com.aiplatform.chat.proto.SimpleResponse> getAddAiModelToChatMethod;
    if ((getAddAiModelToChatMethod = ChatServiceGrpc.getAddAiModelToChatMethod) == null) {
      synchronized (ChatServiceGrpc.class) {
        if ((getAddAiModelToChatMethod = ChatServiceGrpc.getAddAiModelToChatMethod) == null) {
          ChatServiceGrpc.getAddAiModelToChatMethod = getAddAiModelToChatMethod =
              io.grpc.MethodDescriptor.<com.aiplatform.chat.proto.AddAiModelRequest, com.aiplatform.chat.proto.SimpleResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "AddAiModelToChat"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.chat.proto.AddAiModelRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.chat.proto.SimpleResponse.getDefaultInstance()))
              .setSchemaDescriptor(new ChatServiceMethodDescriptorSupplier("AddAiModelToChat"))
              .build();
        }
      }
    }
    return getAddAiModelToChatMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.aiplatform.chat.proto.TypingRequest,
      com.aiplatform.chat.proto.SimpleResponse> getTypingEventMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "TypingEvent",
      requestType = com.aiplatform.chat.proto.TypingRequest.class,
      responseType = com.aiplatform.chat.proto.SimpleResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.aiplatform.chat.proto.TypingRequest,
      com.aiplatform.chat.proto.SimpleResponse> getTypingEventMethod() {
    io.grpc.MethodDescriptor<com.aiplatform.chat.proto.TypingRequest, com.aiplatform.chat.proto.SimpleResponse> getTypingEventMethod;
    if ((getTypingEventMethod = ChatServiceGrpc.getTypingEventMethod) == null) {
      synchronized (ChatServiceGrpc.class) {
        if ((getTypingEventMethod = ChatServiceGrpc.getTypingEventMethod) == null) {
          ChatServiceGrpc.getTypingEventMethod = getTypingEventMethod =
              io.grpc.MethodDescriptor.<com.aiplatform.chat.proto.TypingRequest, com.aiplatform.chat.proto.SimpleResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "TypingEvent"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.chat.proto.TypingRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.chat.proto.SimpleResponse.getDefaultInstance()))
              .setSchemaDescriptor(new ChatServiceMethodDescriptorSupplier("TypingEvent"))
              .build();
        }
      }
    }
    return getTypingEventMethod;
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
    default void createOrGetDirectChat(com.aiplatform.chat.proto.CreateDirectChatRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.chat.proto.ChatroomResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getCreateOrGetDirectChatMethod(), responseObserver);
    }

    /**
     */
    default void createGroupChat(com.aiplatform.chat.proto.CreateGroupChatRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.chat.proto.ChatroomResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getCreateGroupChatMethod(), responseObserver);
    }

    /**
     */
    default void sendMessage(com.aiplatform.chat.proto.SendMessageRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.chat.proto.MessageResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getSendMessageMethod(), responseObserver);
    }

    /**
     */
    default void listMessages(com.aiplatform.chat.proto.ListMessagesRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.chat.proto.ListMessagesResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getListMessagesMethod(), responseObserver);
    }

    /**
     */
    default void addMember(com.aiplatform.chat.proto.AddMemberRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.chat.proto.SimpleResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getAddMemberMethod(), responseObserver);
    }

    /**
     */
    default void removeMember(com.aiplatform.chat.proto.RemoveMemberRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.chat.proto.SimpleResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getRemoveMemberMethod(), responseObserver);
    }

    /**
     */
    default void markAsRead(com.aiplatform.chat.proto.MarkAsReadRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.chat.proto.SimpleResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getMarkAsReadMethod(), responseObserver);
    }

    /**
     */
    default void getMyChatrooms(com.aiplatform.chat.proto.GetMyChatroomsRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.chat.proto.ListChatroomsResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getGetMyChatroomsMethod(), responseObserver);
    }

    /**
     */
    default void addAiModelToChat(com.aiplatform.chat.proto.AddAiModelRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.chat.proto.SimpleResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getAddAiModelToChatMethod(), responseObserver);
    }

    /**
     */
    default void typingEvent(com.aiplatform.chat.proto.TypingRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.chat.proto.SimpleResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getTypingEventMethod(), responseObserver);
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
    public void createOrGetDirectChat(com.aiplatform.chat.proto.CreateDirectChatRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.chat.proto.ChatroomResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getCreateOrGetDirectChatMethod(), getCallOptions()), request, responseObserver);
    }

    /**
     */
    public void createGroupChat(com.aiplatform.chat.proto.CreateGroupChatRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.chat.proto.ChatroomResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getCreateGroupChatMethod(), getCallOptions()), request, responseObserver);
    }

    /**
     */
    public void sendMessage(com.aiplatform.chat.proto.SendMessageRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.chat.proto.MessageResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getSendMessageMethod(), getCallOptions()), request, responseObserver);
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
    public void addMember(com.aiplatform.chat.proto.AddMemberRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.chat.proto.SimpleResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getAddMemberMethod(), getCallOptions()), request, responseObserver);
    }

    /**
     */
    public void removeMember(com.aiplatform.chat.proto.RemoveMemberRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.chat.proto.SimpleResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getRemoveMemberMethod(), getCallOptions()), request, responseObserver);
    }

    /**
     */
    public void markAsRead(com.aiplatform.chat.proto.MarkAsReadRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.chat.proto.SimpleResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getMarkAsReadMethod(), getCallOptions()), request, responseObserver);
    }

    /**
     */
    public void getMyChatrooms(com.aiplatform.chat.proto.GetMyChatroomsRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.chat.proto.ListChatroomsResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getGetMyChatroomsMethod(), getCallOptions()), request, responseObserver);
    }

    /**
     */
    public void addAiModelToChat(com.aiplatform.chat.proto.AddAiModelRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.chat.proto.SimpleResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getAddAiModelToChatMethod(), getCallOptions()), request, responseObserver);
    }

    /**
     */
    public void typingEvent(com.aiplatform.chat.proto.TypingRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.chat.proto.SimpleResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getTypingEventMethod(), getCallOptions()), request, responseObserver);
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
    public com.aiplatform.chat.proto.ChatroomResponse createOrGetDirectChat(com.aiplatform.chat.proto.CreateDirectChatRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getCreateOrGetDirectChatMethod(), getCallOptions(), request);
    }

    /**
     */
    public com.aiplatform.chat.proto.ChatroomResponse createGroupChat(com.aiplatform.chat.proto.CreateGroupChatRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getCreateGroupChatMethod(), getCallOptions(), request);
    }

    /**
     */
    public com.aiplatform.chat.proto.MessageResponse sendMessage(com.aiplatform.chat.proto.SendMessageRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getSendMessageMethod(), getCallOptions(), request);
    }

    /**
     */
    public com.aiplatform.chat.proto.ListMessagesResponse listMessages(com.aiplatform.chat.proto.ListMessagesRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getListMessagesMethod(), getCallOptions(), request);
    }

    /**
     */
    public com.aiplatform.chat.proto.SimpleResponse addMember(com.aiplatform.chat.proto.AddMemberRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getAddMemberMethod(), getCallOptions(), request);
    }

    /**
     */
    public com.aiplatform.chat.proto.SimpleResponse removeMember(com.aiplatform.chat.proto.RemoveMemberRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getRemoveMemberMethod(), getCallOptions(), request);
    }

    /**
     */
    public com.aiplatform.chat.proto.SimpleResponse markAsRead(com.aiplatform.chat.proto.MarkAsReadRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getMarkAsReadMethod(), getCallOptions(), request);
    }

    /**
     */
    public com.aiplatform.chat.proto.ListChatroomsResponse getMyChatrooms(com.aiplatform.chat.proto.GetMyChatroomsRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getGetMyChatroomsMethod(), getCallOptions(), request);
    }

    /**
     */
    public com.aiplatform.chat.proto.SimpleResponse addAiModelToChat(com.aiplatform.chat.proto.AddAiModelRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getAddAiModelToChatMethod(), getCallOptions(), request);
    }

    /**
     */
    public com.aiplatform.chat.proto.SimpleResponse typingEvent(com.aiplatform.chat.proto.TypingRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getTypingEventMethod(), getCallOptions(), request);
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
    public com.google.common.util.concurrent.ListenableFuture<com.aiplatform.chat.proto.ChatroomResponse> createOrGetDirectChat(
        com.aiplatform.chat.proto.CreateDirectChatRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getCreateOrGetDirectChatMethod(), getCallOptions()), request);
    }

    /**
     */
    public com.google.common.util.concurrent.ListenableFuture<com.aiplatform.chat.proto.ChatroomResponse> createGroupChat(
        com.aiplatform.chat.proto.CreateGroupChatRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getCreateGroupChatMethod(), getCallOptions()), request);
    }

    /**
     */
    public com.google.common.util.concurrent.ListenableFuture<com.aiplatform.chat.proto.MessageResponse> sendMessage(
        com.aiplatform.chat.proto.SendMessageRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getSendMessageMethod(), getCallOptions()), request);
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
    public com.google.common.util.concurrent.ListenableFuture<com.aiplatform.chat.proto.SimpleResponse> addMember(
        com.aiplatform.chat.proto.AddMemberRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getAddMemberMethod(), getCallOptions()), request);
    }

    /**
     */
    public com.google.common.util.concurrent.ListenableFuture<com.aiplatform.chat.proto.SimpleResponse> removeMember(
        com.aiplatform.chat.proto.RemoveMemberRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getRemoveMemberMethod(), getCallOptions()), request);
    }

    /**
     */
    public com.google.common.util.concurrent.ListenableFuture<com.aiplatform.chat.proto.SimpleResponse> markAsRead(
        com.aiplatform.chat.proto.MarkAsReadRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getMarkAsReadMethod(), getCallOptions()), request);
    }

    /**
     */
    public com.google.common.util.concurrent.ListenableFuture<com.aiplatform.chat.proto.ListChatroomsResponse> getMyChatrooms(
        com.aiplatform.chat.proto.GetMyChatroomsRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getGetMyChatroomsMethod(), getCallOptions()), request);
    }

    /**
     */
    public com.google.common.util.concurrent.ListenableFuture<com.aiplatform.chat.proto.SimpleResponse> addAiModelToChat(
        com.aiplatform.chat.proto.AddAiModelRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getAddAiModelToChatMethod(), getCallOptions()), request);
    }

    /**
     */
    public com.google.common.util.concurrent.ListenableFuture<com.aiplatform.chat.proto.SimpleResponse> typingEvent(
        com.aiplatform.chat.proto.TypingRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getTypingEventMethod(), getCallOptions()), request);
    }
  }

  private static final int METHODID_CREATE_OR_GET_DIRECT_CHAT = 0;
  private static final int METHODID_CREATE_GROUP_CHAT = 1;
  private static final int METHODID_SEND_MESSAGE = 2;
  private static final int METHODID_LIST_MESSAGES = 3;
  private static final int METHODID_ADD_MEMBER = 4;
  private static final int METHODID_REMOVE_MEMBER = 5;
  private static final int METHODID_MARK_AS_READ = 6;
  private static final int METHODID_GET_MY_CHATROOMS = 7;
  private static final int METHODID_ADD_AI_MODEL_TO_CHAT = 8;
  private static final int METHODID_TYPING_EVENT = 9;

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
        case METHODID_CREATE_OR_GET_DIRECT_CHAT:
          serviceImpl.createOrGetDirectChat((com.aiplatform.chat.proto.CreateDirectChatRequest) request,
              (io.grpc.stub.StreamObserver<com.aiplatform.chat.proto.ChatroomResponse>) responseObserver);
          break;
        case METHODID_CREATE_GROUP_CHAT:
          serviceImpl.createGroupChat((com.aiplatform.chat.proto.CreateGroupChatRequest) request,
              (io.grpc.stub.StreamObserver<com.aiplatform.chat.proto.ChatroomResponse>) responseObserver);
          break;
        case METHODID_SEND_MESSAGE:
          serviceImpl.sendMessage((com.aiplatform.chat.proto.SendMessageRequest) request,
              (io.grpc.stub.StreamObserver<com.aiplatform.chat.proto.MessageResponse>) responseObserver);
          break;
        case METHODID_LIST_MESSAGES:
          serviceImpl.listMessages((com.aiplatform.chat.proto.ListMessagesRequest) request,
              (io.grpc.stub.StreamObserver<com.aiplatform.chat.proto.ListMessagesResponse>) responseObserver);
          break;
        case METHODID_ADD_MEMBER:
          serviceImpl.addMember((com.aiplatform.chat.proto.AddMemberRequest) request,
              (io.grpc.stub.StreamObserver<com.aiplatform.chat.proto.SimpleResponse>) responseObserver);
          break;
        case METHODID_REMOVE_MEMBER:
          serviceImpl.removeMember((com.aiplatform.chat.proto.RemoveMemberRequest) request,
              (io.grpc.stub.StreamObserver<com.aiplatform.chat.proto.SimpleResponse>) responseObserver);
          break;
        case METHODID_MARK_AS_READ:
          serviceImpl.markAsRead((com.aiplatform.chat.proto.MarkAsReadRequest) request,
              (io.grpc.stub.StreamObserver<com.aiplatform.chat.proto.SimpleResponse>) responseObserver);
          break;
        case METHODID_GET_MY_CHATROOMS:
          serviceImpl.getMyChatrooms((com.aiplatform.chat.proto.GetMyChatroomsRequest) request,
              (io.grpc.stub.StreamObserver<com.aiplatform.chat.proto.ListChatroomsResponse>) responseObserver);
          break;
        case METHODID_ADD_AI_MODEL_TO_CHAT:
          serviceImpl.addAiModelToChat((com.aiplatform.chat.proto.AddAiModelRequest) request,
              (io.grpc.stub.StreamObserver<com.aiplatform.chat.proto.SimpleResponse>) responseObserver);
          break;
        case METHODID_TYPING_EVENT:
          serviceImpl.typingEvent((com.aiplatform.chat.proto.TypingRequest) request,
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
          getCreateOrGetDirectChatMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.aiplatform.chat.proto.CreateDirectChatRequest,
              com.aiplatform.chat.proto.ChatroomResponse>(
                service, METHODID_CREATE_OR_GET_DIRECT_CHAT)))
        .addMethod(
          getCreateGroupChatMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.aiplatform.chat.proto.CreateGroupChatRequest,
              com.aiplatform.chat.proto.ChatroomResponse>(
                service, METHODID_CREATE_GROUP_CHAT)))
        .addMethod(
          getSendMessageMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.aiplatform.chat.proto.SendMessageRequest,
              com.aiplatform.chat.proto.MessageResponse>(
                service, METHODID_SEND_MESSAGE)))
        .addMethod(
          getListMessagesMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.aiplatform.chat.proto.ListMessagesRequest,
              com.aiplatform.chat.proto.ListMessagesResponse>(
                service, METHODID_LIST_MESSAGES)))
        .addMethod(
          getAddMemberMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.aiplatform.chat.proto.AddMemberRequest,
              com.aiplatform.chat.proto.SimpleResponse>(
                service, METHODID_ADD_MEMBER)))
        .addMethod(
          getRemoveMemberMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.aiplatform.chat.proto.RemoveMemberRequest,
              com.aiplatform.chat.proto.SimpleResponse>(
                service, METHODID_REMOVE_MEMBER)))
        .addMethod(
          getMarkAsReadMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.aiplatform.chat.proto.MarkAsReadRequest,
              com.aiplatform.chat.proto.SimpleResponse>(
                service, METHODID_MARK_AS_READ)))
        .addMethod(
          getGetMyChatroomsMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.aiplatform.chat.proto.GetMyChatroomsRequest,
              com.aiplatform.chat.proto.ListChatroomsResponse>(
                service, METHODID_GET_MY_CHATROOMS)))
        .addMethod(
          getAddAiModelToChatMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.aiplatform.chat.proto.AddAiModelRequest,
              com.aiplatform.chat.proto.SimpleResponse>(
                service, METHODID_ADD_AI_MODEL_TO_CHAT)))
        .addMethod(
          getTypingEventMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.aiplatform.chat.proto.TypingRequest,
              com.aiplatform.chat.proto.SimpleResponse>(
                service, METHODID_TYPING_EVENT)))
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
              .addMethod(getCreateOrGetDirectChatMethod())
              .addMethod(getCreateGroupChatMethod())
              .addMethod(getSendMessageMethod())
              .addMethod(getListMessagesMethod())
              .addMethod(getAddMemberMethod())
              .addMethod(getRemoveMemberMethod())
              .addMethod(getMarkAsReadMethod())
              .addMethod(getGetMyChatroomsMethod())
              .addMethod(getAddAiModelToChatMethod())
              .addMethod(getTypingEventMethod())
              .build();
        }
      }
    }
    return result;
  }
}
