package com.aiplatform.file.proto;

import static io.grpc.MethodDescriptor.generateFullMethodName;

/**
 */
@javax.annotation.Generated(
    value = "by gRPC proto compiler (version 1.69.0)",
    comments = "Source: file.proto")
@io.grpc.stub.annotations.GrpcGenerated
public final class FileServiceGrpc {

  private FileServiceGrpc() {}

  public static final java.lang.String SERVICE_NAME = "file.v1.FileService";

  // Static method descriptors that strictly reflect the proto.
  private static volatile io.grpc.MethodDescriptor<com.aiplatform.file.proto.CreateFolderRequest,
      com.aiplatform.file.proto.FolderResponse> getCreateFolderMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "CreateFolder",
      requestType = com.aiplatform.file.proto.CreateFolderRequest.class,
      responseType = com.aiplatform.file.proto.FolderResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.aiplatform.file.proto.CreateFolderRequest,
      com.aiplatform.file.proto.FolderResponse> getCreateFolderMethod() {
    io.grpc.MethodDescriptor<com.aiplatform.file.proto.CreateFolderRequest, com.aiplatform.file.proto.FolderResponse> getCreateFolderMethod;
    if ((getCreateFolderMethod = FileServiceGrpc.getCreateFolderMethod) == null) {
      synchronized (FileServiceGrpc.class) {
        if ((getCreateFolderMethod = FileServiceGrpc.getCreateFolderMethod) == null) {
          FileServiceGrpc.getCreateFolderMethod = getCreateFolderMethod =
              io.grpc.MethodDescriptor.<com.aiplatform.file.proto.CreateFolderRequest, com.aiplatform.file.proto.FolderResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "CreateFolder"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.file.proto.CreateFolderRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.file.proto.FolderResponse.getDefaultInstance()))
              .setSchemaDescriptor(new FileServiceMethodDescriptorSupplier("CreateFolder"))
              .build();
        }
      }
    }
    return getCreateFolderMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.aiplatform.file.proto.UpdateFolderRequest,
      com.aiplatform.file.proto.FolderResponse> getUpdateFolderMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "UpdateFolder",
      requestType = com.aiplatform.file.proto.UpdateFolderRequest.class,
      responseType = com.aiplatform.file.proto.FolderResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.aiplatform.file.proto.UpdateFolderRequest,
      com.aiplatform.file.proto.FolderResponse> getUpdateFolderMethod() {
    io.grpc.MethodDescriptor<com.aiplatform.file.proto.UpdateFolderRequest, com.aiplatform.file.proto.FolderResponse> getUpdateFolderMethod;
    if ((getUpdateFolderMethod = FileServiceGrpc.getUpdateFolderMethod) == null) {
      synchronized (FileServiceGrpc.class) {
        if ((getUpdateFolderMethod = FileServiceGrpc.getUpdateFolderMethod) == null) {
          FileServiceGrpc.getUpdateFolderMethod = getUpdateFolderMethod =
              io.grpc.MethodDescriptor.<com.aiplatform.file.proto.UpdateFolderRequest, com.aiplatform.file.proto.FolderResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "UpdateFolder"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.file.proto.UpdateFolderRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.file.proto.FolderResponse.getDefaultInstance()))
              .setSchemaDescriptor(new FileServiceMethodDescriptorSupplier("UpdateFolder"))
              .build();
        }
      }
    }
    return getUpdateFolderMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.aiplatform.file.proto.DeleteFolderRequest,
      com.aiplatform.file.proto.SimpleResponse> getDeleteFolderMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "DeleteFolder",
      requestType = com.aiplatform.file.proto.DeleteFolderRequest.class,
      responseType = com.aiplatform.file.proto.SimpleResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.aiplatform.file.proto.DeleteFolderRequest,
      com.aiplatform.file.proto.SimpleResponse> getDeleteFolderMethod() {
    io.grpc.MethodDescriptor<com.aiplatform.file.proto.DeleteFolderRequest, com.aiplatform.file.proto.SimpleResponse> getDeleteFolderMethod;
    if ((getDeleteFolderMethod = FileServiceGrpc.getDeleteFolderMethod) == null) {
      synchronized (FileServiceGrpc.class) {
        if ((getDeleteFolderMethod = FileServiceGrpc.getDeleteFolderMethod) == null) {
          FileServiceGrpc.getDeleteFolderMethod = getDeleteFolderMethod =
              io.grpc.MethodDescriptor.<com.aiplatform.file.proto.DeleteFolderRequest, com.aiplatform.file.proto.SimpleResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "DeleteFolder"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.file.proto.DeleteFolderRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.file.proto.SimpleResponse.getDefaultInstance()))
              .setSchemaDescriptor(new FileServiceMethodDescriptorSupplier("DeleteFolder"))
              .build();
        }
      }
    }
    return getDeleteFolderMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.aiplatform.file.proto.ShareFolderRequest,
      com.aiplatform.file.proto.SimpleResponse> getShareFolderMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "ShareFolder",
      requestType = com.aiplatform.file.proto.ShareFolderRequest.class,
      responseType = com.aiplatform.file.proto.SimpleResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.aiplatform.file.proto.ShareFolderRequest,
      com.aiplatform.file.proto.SimpleResponse> getShareFolderMethod() {
    io.grpc.MethodDescriptor<com.aiplatform.file.proto.ShareFolderRequest, com.aiplatform.file.proto.SimpleResponse> getShareFolderMethod;
    if ((getShareFolderMethod = FileServiceGrpc.getShareFolderMethod) == null) {
      synchronized (FileServiceGrpc.class) {
        if ((getShareFolderMethod = FileServiceGrpc.getShareFolderMethod) == null) {
          FileServiceGrpc.getShareFolderMethod = getShareFolderMethod =
              io.grpc.MethodDescriptor.<com.aiplatform.file.proto.ShareFolderRequest, com.aiplatform.file.proto.SimpleResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "ShareFolder"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.file.proto.ShareFolderRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.file.proto.SimpleResponse.getDefaultInstance()))
              .setSchemaDescriptor(new FileServiceMethodDescriptorSupplier("ShareFolder"))
              .build();
        }
      }
    }
    return getShareFolderMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.aiplatform.file.proto.UnshareFolderRequest,
      com.aiplatform.file.proto.SimpleResponse> getUnshareFolderMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "UnshareFolder",
      requestType = com.aiplatform.file.proto.UnshareFolderRequest.class,
      responseType = com.aiplatform.file.proto.SimpleResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.aiplatform.file.proto.UnshareFolderRequest,
      com.aiplatform.file.proto.SimpleResponse> getUnshareFolderMethod() {
    io.grpc.MethodDescriptor<com.aiplatform.file.proto.UnshareFolderRequest, com.aiplatform.file.proto.SimpleResponse> getUnshareFolderMethod;
    if ((getUnshareFolderMethod = FileServiceGrpc.getUnshareFolderMethod) == null) {
      synchronized (FileServiceGrpc.class) {
        if ((getUnshareFolderMethod = FileServiceGrpc.getUnshareFolderMethod) == null) {
          FileServiceGrpc.getUnshareFolderMethod = getUnshareFolderMethod =
              io.grpc.MethodDescriptor.<com.aiplatform.file.proto.UnshareFolderRequest, com.aiplatform.file.proto.SimpleResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "UnshareFolder"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.file.proto.UnshareFolderRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.file.proto.SimpleResponse.getDefaultInstance()))
              .setSchemaDescriptor(new FileServiceMethodDescriptorSupplier("UnshareFolder"))
              .build();
        }
      }
    }
    return getUnshareFolderMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.aiplatform.file.proto.ListMyFoldersRequest,
      com.aiplatform.file.proto.ListFoldersResponse> getListMyFoldersMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "ListMyFolders",
      requestType = com.aiplatform.file.proto.ListMyFoldersRequest.class,
      responseType = com.aiplatform.file.proto.ListFoldersResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.aiplatform.file.proto.ListMyFoldersRequest,
      com.aiplatform.file.proto.ListFoldersResponse> getListMyFoldersMethod() {
    io.grpc.MethodDescriptor<com.aiplatform.file.proto.ListMyFoldersRequest, com.aiplatform.file.proto.ListFoldersResponse> getListMyFoldersMethod;
    if ((getListMyFoldersMethod = FileServiceGrpc.getListMyFoldersMethod) == null) {
      synchronized (FileServiceGrpc.class) {
        if ((getListMyFoldersMethod = FileServiceGrpc.getListMyFoldersMethod) == null) {
          FileServiceGrpc.getListMyFoldersMethod = getListMyFoldersMethod =
              io.grpc.MethodDescriptor.<com.aiplatform.file.proto.ListMyFoldersRequest, com.aiplatform.file.proto.ListFoldersResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "ListMyFolders"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.file.proto.ListMyFoldersRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.file.proto.ListFoldersResponse.getDefaultInstance()))
              .setSchemaDescriptor(new FileServiceMethodDescriptorSupplier("ListMyFolders"))
              .build();
        }
      }
    }
    return getListMyFoldersMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.aiplatform.file.proto.ListSharedFoldersRequest,
      com.aiplatform.file.proto.ListFoldersResponse> getListSharedFoldersMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "ListSharedFolders",
      requestType = com.aiplatform.file.proto.ListSharedFoldersRequest.class,
      responseType = com.aiplatform.file.proto.ListFoldersResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.aiplatform.file.proto.ListSharedFoldersRequest,
      com.aiplatform.file.proto.ListFoldersResponse> getListSharedFoldersMethod() {
    io.grpc.MethodDescriptor<com.aiplatform.file.proto.ListSharedFoldersRequest, com.aiplatform.file.proto.ListFoldersResponse> getListSharedFoldersMethod;
    if ((getListSharedFoldersMethod = FileServiceGrpc.getListSharedFoldersMethod) == null) {
      synchronized (FileServiceGrpc.class) {
        if ((getListSharedFoldersMethod = FileServiceGrpc.getListSharedFoldersMethod) == null) {
          FileServiceGrpc.getListSharedFoldersMethod = getListSharedFoldersMethod =
              io.grpc.MethodDescriptor.<com.aiplatform.file.proto.ListSharedFoldersRequest, com.aiplatform.file.proto.ListFoldersResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "ListSharedFolders"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.file.proto.ListSharedFoldersRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.file.proto.ListFoldersResponse.getDefaultInstance()))
              .setSchemaDescriptor(new FileServiceMethodDescriptorSupplier("ListSharedFolders"))
              .build();
        }
      }
    }
    return getListSharedFoldersMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.aiplatform.file.proto.UploadFileRequest,
      com.aiplatform.file.proto.FileResponse> getUploadFileMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "UploadFile",
      requestType = com.aiplatform.file.proto.UploadFileRequest.class,
      responseType = com.aiplatform.file.proto.FileResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.aiplatform.file.proto.UploadFileRequest,
      com.aiplatform.file.proto.FileResponse> getUploadFileMethod() {
    io.grpc.MethodDescriptor<com.aiplatform.file.proto.UploadFileRequest, com.aiplatform.file.proto.FileResponse> getUploadFileMethod;
    if ((getUploadFileMethod = FileServiceGrpc.getUploadFileMethod) == null) {
      synchronized (FileServiceGrpc.class) {
        if ((getUploadFileMethod = FileServiceGrpc.getUploadFileMethod) == null) {
          FileServiceGrpc.getUploadFileMethod = getUploadFileMethod =
              io.grpc.MethodDescriptor.<com.aiplatform.file.proto.UploadFileRequest, com.aiplatform.file.proto.FileResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "UploadFile"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.file.proto.UploadFileRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.file.proto.FileResponse.getDefaultInstance()))
              .setSchemaDescriptor(new FileServiceMethodDescriptorSupplier("UploadFile"))
              .build();
        }
      }
    }
    return getUploadFileMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.aiplatform.file.proto.GetFileRequest,
      com.aiplatform.file.proto.FileResponse> getGetFileMetadataMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "GetFileMetadata",
      requestType = com.aiplatform.file.proto.GetFileRequest.class,
      responseType = com.aiplatform.file.proto.FileResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.aiplatform.file.proto.GetFileRequest,
      com.aiplatform.file.proto.FileResponse> getGetFileMetadataMethod() {
    io.grpc.MethodDescriptor<com.aiplatform.file.proto.GetFileRequest, com.aiplatform.file.proto.FileResponse> getGetFileMetadataMethod;
    if ((getGetFileMetadataMethod = FileServiceGrpc.getGetFileMetadataMethod) == null) {
      synchronized (FileServiceGrpc.class) {
        if ((getGetFileMetadataMethod = FileServiceGrpc.getGetFileMetadataMethod) == null) {
          FileServiceGrpc.getGetFileMetadataMethod = getGetFileMetadataMethod =
              io.grpc.MethodDescriptor.<com.aiplatform.file.proto.GetFileRequest, com.aiplatform.file.proto.FileResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "GetFileMetadata"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.file.proto.GetFileRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.file.proto.FileResponse.getDefaultInstance()))
              .setSchemaDescriptor(new FileServiceMethodDescriptorSupplier("GetFileMetadata"))
              .build();
        }
      }
    }
    return getGetFileMetadataMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.aiplatform.file.proto.DeleteFileRequest,
      com.aiplatform.file.proto.SimpleResponse> getDeleteFileMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "DeleteFile",
      requestType = com.aiplatform.file.proto.DeleteFileRequest.class,
      responseType = com.aiplatform.file.proto.SimpleResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.aiplatform.file.proto.DeleteFileRequest,
      com.aiplatform.file.proto.SimpleResponse> getDeleteFileMethod() {
    io.grpc.MethodDescriptor<com.aiplatform.file.proto.DeleteFileRequest, com.aiplatform.file.proto.SimpleResponse> getDeleteFileMethod;
    if ((getDeleteFileMethod = FileServiceGrpc.getDeleteFileMethod) == null) {
      synchronized (FileServiceGrpc.class) {
        if ((getDeleteFileMethod = FileServiceGrpc.getDeleteFileMethod) == null) {
          FileServiceGrpc.getDeleteFileMethod = getDeleteFileMethod =
              io.grpc.MethodDescriptor.<com.aiplatform.file.proto.DeleteFileRequest, com.aiplatform.file.proto.SimpleResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "DeleteFile"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.file.proto.DeleteFileRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.file.proto.SimpleResponse.getDefaultInstance()))
              .setSchemaDescriptor(new FileServiceMethodDescriptorSupplier("DeleteFile"))
              .build();
        }
      }
    }
    return getDeleteFileMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.aiplatform.file.proto.ShareFileRequest,
      com.aiplatform.file.proto.SimpleResponse> getShareFileMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "ShareFile",
      requestType = com.aiplatform.file.proto.ShareFileRequest.class,
      responseType = com.aiplatform.file.proto.SimpleResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.aiplatform.file.proto.ShareFileRequest,
      com.aiplatform.file.proto.SimpleResponse> getShareFileMethod() {
    io.grpc.MethodDescriptor<com.aiplatform.file.proto.ShareFileRequest, com.aiplatform.file.proto.SimpleResponse> getShareFileMethod;
    if ((getShareFileMethod = FileServiceGrpc.getShareFileMethod) == null) {
      synchronized (FileServiceGrpc.class) {
        if ((getShareFileMethod = FileServiceGrpc.getShareFileMethod) == null) {
          FileServiceGrpc.getShareFileMethod = getShareFileMethod =
              io.grpc.MethodDescriptor.<com.aiplatform.file.proto.ShareFileRequest, com.aiplatform.file.proto.SimpleResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "ShareFile"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.file.proto.ShareFileRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.file.proto.SimpleResponse.getDefaultInstance()))
              .setSchemaDescriptor(new FileServiceMethodDescriptorSupplier("ShareFile"))
              .build();
        }
      }
    }
    return getShareFileMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.aiplatform.file.proto.UnshareFileRequest,
      com.aiplatform.file.proto.SimpleResponse> getUnshareFileMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "UnshareFile",
      requestType = com.aiplatform.file.proto.UnshareFileRequest.class,
      responseType = com.aiplatform.file.proto.SimpleResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.aiplatform.file.proto.UnshareFileRequest,
      com.aiplatform.file.proto.SimpleResponse> getUnshareFileMethod() {
    io.grpc.MethodDescriptor<com.aiplatform.file.proto.UnshareFileRequest, com.aiplatform.file.proto.SimpleResponse> getUnshareFileMethod;
    if ((getUnshareFileMethod = FileServiceGrpc.getUnshareFileMethod) == null) {
      synchronized (FileServiceGrpc.class) {
        if ((getUnshareFileMethod = FileServiceGrpc.getUnshareFileMethod) == null) {
          FileServiceGrpc.getUnshareFileMethod = getUnshareFileMethod =
              io.grpc.MethodDescriptor.<com.aiplatform.file.proto.UnshareFileRequest, com.aiplatform.file.proto.SimpleResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "UnshareFile"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.file.proto.UnshareFileRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.file.proto.SimpleResponse.getDefaultInstance()))
              .setSchemaDescriptor(new FileServiceMethodDescriptorSupplier("UnshareFile"))
              .build();
        }
      }
    }
    return getUnshareFileMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.aiplatform.file.proto.UpdateFileMetadataRequest,
      com.aiplatform.file.proto.FileResponse> getUpdateFileMetadataMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "UpdateFileMetadata",
      requestType = com.aiplatform.file.proto.UpdateFileMetadataRequest.class,
      responseType = com.aiplatform.file.proto.FileResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.aiplatform.file.proto.UpdateFileMetadataRequest,
      com.aiplatform.file.proto.FileResponse> getUpdateFileMetadataMethod() {
    io.grpc.MethodDescriptor<com.aiplatform.file.proto.UpdateFileMetadataRequest, com.aiplatform.file.proto.FileResponse> getUpdateFileMetadataMethod;
    if ((getUpdateFileMetadataMethod = FileServiceGrpc.getUpdateFileMetadataMethod) == null) {
      synchronized (FileServiceGrpc.class) {
        if ((getUpdateFileMetadataMethod = FileServiceGrpc.getUpdateFileMetadataMethod) == null) {
          FileServiceGrpc.getUpdateFileMetadataMethod = getUpdateFileMetadataMethod =
              io.grpc.MethodDescriptor.<com.aiplatform.file.proto.UpdateFileMetadataRequest, com.aiplatform.file.proto.FileResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "UpdateFileMetadata"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.file.proto.UpdateFileMetadataRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.file.proto.FileResponse.getDefaultInstance()))
              .setSchemaDescriptor(new FileServiceMethodDescriptorSupplier("UpdateFileMetadata"))
              .build();
        }
      }
    }
    return getUpdateFileMetadataMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.aiplatform.file.proto.ListMyFilesRequest,
      com.aiplatform.file.proto.ListFilesResponse> getListMyFilesMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "ListMyFiles",
      requestType = com.aiplatform.file.proto.ListMyFilesRequest.class,
      responseType = com.aiplatform.file.proto.ListFilesResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.aiplatform.file.proto.ListMyFilesRequest,
      com.aiplatform.file.proto.ListFilesResponse> getListMyFilesMethod() {
    io.grpc.MethodDescriptor<com.aiplatform.file.proto.ListMyFilesRequest, com.aiplatform.file.proto.ListFilesResponse> getListMyFilesMethod;
    if ((getListMyFilesMethod = FileServiceGrpc.getListMyFilesMethod) == null) {
      synchronized (FileServiceGrpc.class) {
        if ((getListMyFilesMethod = FileServiceGrpc.getListMyFilesMethod) == null) {
          FileServiceGrpc.getListMyFilesMethod = getListMyFilesMethod =
              io.grpc.MethodDescriptor.<com.aiplatform.file.proto.ListMyFilesRequest, com.aiplatform.file.proto.ListFilesResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "ListMyFiles"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.file.proto.ListMyFilesRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.file.proto.ListFilesResponse.getDefaultInstance()))
              .setSchemaDescriptor(new FileServiceMethodDescriptorSupplier("ListMyFiles"))
              .build();
        }
      }
    }
    return getListMyFilesMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.aiplatform.file.proto.ListSharedWithMeRequest,
      com.aiplatform.file.proto.ListFilesResponse> getListSharedWithMeMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "ListSharedWithMe",
      requestType = com.aiplatform.file.proto.ListSharedWithMeRequest.class,
      responseType = com.aiplatform.file.proto.ListFilesResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.aiplatform.file.proto.ListSharedWithMeRequest,
      com.aiplatform.file.proto.ListFilesResponse> getListSharedWithMeMethod() {
    io.grpc.MethodDescriptor<com.aiplatform.file.proto.ListSharedWithMeRequest, com.aiplatform.file.proto.ListFilesResponse> getListSharedWithMeMethod;
    if ((getListSharedWithMeMethod = FileServiceGrpc.getListSharedWithMeMethod) == null) {
      synchronized (FileServiceGrpc.class) {
        if ((getListSharedWithMeMethod = FileServiceGrpc.getListSharedWithMeMethod) == null) {
          FileServiceGrpc.getListSharedWithMeMethod = getListSharedWithMeMethod =
              io.grpc.MethodDescriptor.<com.aiplatform.file.proto.ListSharedWithMeRequest, com.aiplatform.file.proto.ListFilesResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "ListSharedWithMe"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.file.proto.ListSharedWithMeRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.file.proto.ListFilesResponse.getDefaultInstance()))
              .setSchemaDescriptor(new FileServiceMethodDescriptorSupplier("ListSharedWithMe"))
              .build();
        }
      }
    }
    return getListSharedWithMeMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.aiplatform.file.proto.GetFilePathRequest,
      com.aiplatform.file.proto.FilePathResponse> getGetFilePathMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "GetFilePath",
      requestType = com.aiplatform.file.proto.GetFilePathRequest.class,
      responseType = com.aiplatform.file.proto.FilePathResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.aiplatform.file.proto.GetFilePathRequest,
      com.aiplatform.file.proto.FilePathResponse> getGetFilePathMethod() {
    io.grpc.MethodDescriptor<com.aiplatform.file.proto.GetFilePathRequest, com.aiplatform.file.proto.FilePathResponse> getGetFilePathMethod;
    if ((getGetFilePathMethod = FileServiceGrpc.getGetFilePathMethod) == null) {
      synchronized (FileServiceGrpc.class) {
        if ((getGetFilePathMethod = FileServiceGrpc.getGetFilePathMethod) == null) {
          FileServiceGrpc.getGetFilePathMethod = getGetFilePathMethod =
              io.grpc.MethodDescriptor.<com.aiplatform.file.proto.GetFilePathRequest, com.aiplatform.file.proto.FilePathResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "GetFilePath"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.file.proto.GetFilePathRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.aiplatform.file.proto.FilePathResponse.getDefaultInstance()))
              .setSchemaDescriptor(new FileServiceMethodDescriptorSupplier("GetFilePath"))
              .build();
        }
      }
    }
    return getGetFilePathMethod;
  }

  /**
   * Creates a new async stub that supports all call types for the service
   */
  public static FileServiceStub newStub(io.grpc.Channel channel) {
    io.grpc.stub.AbstractStub.StubFactory<FileServiceStub> factory =
      new io.grpc.stub.AbstractStub.StubFactory<FileServiceStub>() {
        @java.lang.Override
        public FileServiceStub newStub(io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
          return new FileServiceStub(channel, callOptions);
        }
      };
    return FileServiceStub.newStub(factory, channel);
  }

  /**
   * Creates a new blocking-style stub that supports unary and streaming output calls on the service
   */
  public static FileServiceBlockingStub newBlockingStub(
      io.grpc.Channel channel) {
    io.grpc.stub.AbstractStub.StubFactory<FileServiceBlockingStub> factory =
      new io.grpc.stub.AbstractStub.StubFactory<FileServiceBlockingStub>() {
        @java.lang.Override
        public FileServiceBlockingStub newStub(io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
          return new FileServiceBlockingStub(channel, callOptions);
        }
      };
    return FileServiceBlockingStub.newStub(factory, channel);
  }

  /**
   * Creates a new ListenableFuture-style stub that supports unary calls on the service
   */
  public static FileServiceFutureStub newFutureStub(
      io.grpc.Channel channel) {
    io.grpc.stub.AbstractStub.StubFactory<FileServiceFutureStub> factory =
      new io.grpc.stub.AbstractStub.StubFactory<FileServiceFutureStub>() {
        @java.lang.Override
        public FileServiceFutureStub newStub(io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
          return new FileServiceFutureStub(channel, callOptions);
        }
      };
    return FileServiceFutureStub.newStub(factory, channel);
  }

  /**
   */
  public interface AsyncService {

    /**
     */
    default void createFolder(com.aiplatform.file.proto.CreateFolderRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.file.proto.FolderResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getCreateFolderMethod(), responseObserver);
    }

    /**
     */
    default void updateFolder(com.aiplatform.file.proto.UpdateFolderRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.file.proto.FolderResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getUpdateFolderMethod(), responseObserver);
    }

    /**
     */
    default void deleteFolder(com.aiplatform.file.proto.DeleteFolderRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.file.proto.SimpleResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getDeleteFolderMethod(), responseObserver);
    }

    /**
     */
    default void shareFolder(com.aiplatform.file.proto.ShareFolderRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.file.proto.SimpleResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getShareFolderMethod(), responseObserver);
    }

    /**
     */
    default void unshareFolder(com.aiplatform.file.proto.UnshareFolderRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.file.proto.SimpleResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getUnshareFolderMethod(), responseObserver);
    }

    /**
     */
    default void listMyFolders(com.aiplatform.file.proto.ListMyFoldersRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.file.proto.ListFoldersResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getListMyFoldersMethod(), responseObserver);
    }

    /**
     */
    default void listSharedFolders(com.aiplatform.file.proto.ListSharedFoldersRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.file.proto.ListFoldersResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getListSharedFoldersMethod(), responseObserver);
    }

    /**
     */
    default void uploadFile(com.aiplatform.file.proto.UploadFileRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.file.proto.FileResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getUploadFileMethod(), responseObserver);
    }

    /**
     */
    default void getFileMetadata(com.aiplatform.file.proto.GetFileRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.file.proto.FileResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getGetFileMetadataMethod(), responseObserver);
    }

    /**
     */
    default void deleteFile(com.aiplatform.file.proto.DeleteFileRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.file.proto.SimpleResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getDeleteFileMethod(), responseObserver);
    }

    /**
     */
    default void shareFile(com.aiplatform.file.proto.ShareFileRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.file.proto.SimpleResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getShareFileMethod(), responseObserver);
    }

    /**
     */
    default void unshareFile(com.aiplatform.file.proto.UnshareFileRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.file.proto.SimpleResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getUnshareFileMethod(), responseObserver);
    }

    /**
     */
    default void updateFileMetadata(com.aiplatform.file.proto.UpdateFileMetadataRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.file.proto.FileResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getUpdateFileMetadataMethod(), responseObserver);
    }

    /**
     */
    default void listMyFiles(com.aiplatform.file.proto.ListMyFilesRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.file.proto.ListFilesResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getListMyFilesMethod(), responseObserver);
    }

    /**
     */
    default void listSharedWithMe(com.aiplatform.file.proto.ListSharedWithMeRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.file.proto.ListFilesResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getListSharedWithMeMethod(), responseObserver);
    }

    /**
     */
    default void getFilePath(com.aiplatform.file.proto.GetFilePathRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.file.proto.FilePathResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getGetFilePathMethod(), responseObserver);
    }
  }

  /**
   * Base class for the server implementation of the service FileService.
   */
  public static abstract class FileServiceImplBase
      implements io.grpc.BindableService, AsyncService {

    @java.lang.Override public final io.grpc.ServerServiceDefinition bindService() {
      return FileServiceGrpc.bindService(this);
    }
  }

  /**
   * A stub to allow clients to do asynchronous rpc calls to service FileService.
   */
  public static final class FileServiceStub
      extends io.grpc.stub.AbstractAsyncStub<FileServiceStub> {
    private FileServiceStub(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      super(channel, callOptions);
    }

    @java.lang.Override
    protected FileServiceStub build(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      return new FileServiceStub(channel, callOptions);
    }

    /**
     */
    public void createFolder(com.aiplatform.file.proto.CreateFolderRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.file.proto.FolderResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getCreateFolderMethod(), getCallOptions()), request, responseObserver);
    }

    /**
     */
    public void updateFolder(com.aiplatform.file.proto.UpdateFolderRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.file.proto.FolderResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getUpdateFolderMethod(), getCallOptions()), request, responseObserver);
    }

    /**
     */
    public void deleteFolder(com.aiplatform.file.proto.DeleteFolderRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.file.proto.SimpleResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getDeleteFolderMethod(), getCallOptions()), request, responseObserver);
    }

    /**
     */
    public void shareFolder(com.aiplatform.file.proto.ShareFolderRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.file.proto.SimpleResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getShareFolderMethod(), getCallOptions()), request, responseObserver);
    }

    /**
     */
    public void unshareFolder(com.aiplatform.file.proto.UnshareFolderRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.file.proto.SimpleResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getUnshareFolderMethod(), getCallOptions()), request, responseObserver);
    }

    /**
     */
    public void listMyFolders(com.aiplatform.file.proto.ListMyFoldersRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.file.proto.ListFoldersResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getListMyFoldersMethod(), getCallOptions()), request, responseObserver);
    }

    /**
     */
    public void listSharedFolders(com.aiplatform.file.proto.ListSharedFoldersRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.file.proto.ListFoldersResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getListSharedFoldersMethod(), getCallOptions()), request, responseObserver);
    }

    /**
     */
    public void uploadFile(com.aiplatform.file.proto.UploadFileRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.file.proto.FileResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getUploadFileMethod(), getCallOptions()), request, responseObserver);
    }

    /**
     */
    public void getFileMetadata(com.aiplatform.file.proto.GetFileRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.file.proto.FileResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getGetFileMetadataMethod(), getCallOptions()), request, responseObserver);
    }

    /**
     */
    public void deleteFile(com.aiplatform.file.proto.DeleteFileRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.file.proto.SimpleResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getDeleteFileMethod(), getCallOptions()), request, responseObserver);
    }

    /**
     */
    public void shareFile(com.aiplatform.file.proto.ShareFileRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.file.proto.SimpleResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getShareFileMethod(), getCallOptions()), request, responseObserver);
    }

    /**
     */
    public void unshareFile(com.aiplatform.file.proto.UnshareFileRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.file.proto.SimpleResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getUnshareFileMethod(), getCallOptions()), request, responseObserver);
    }

    /**
     */
    public void updateFileMetadata(com.aiplatform.file.proto.UpdateFileMetadataRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.file.proto.FileResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getUpdateFileMetadataMethod(), getCallOptions()), request, responseObserver);
    }

    /**
     */
    public void listMyFiles(com.aiplatform.file.proto.ListMyFilesRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.file.proto.ListFilesResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getListMyFilesMethod(), getCallOptions()), request, responseObserver);
    }

    /**
     */
    public void listSharedWithMe(com.aiplatform.file.proto.ListSharedWithMeRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.file.proto.ListFilesResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getListSharedWithMeMethod(), getCallOptions()), request, responseObserver);
    }

    /**
     */
    public void getFilePath(com.aiplatform.file.proto.GetFilePathRequest request,
        io.grpc.stub.StreamObserver<com.aiplatform.file.proto.FilePathResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getGetFilePathMethod(), getCallOptions()), request, responseObserver);
    }
  }

  /**
   * A stub to allow clients to do synchronous rpc calls to service FileService.
   */
  public static final class FileServiceBlockingStub
      extends io.grpc.stub.AbstractBlockingStub<FileServiceBlockingStub> {
    private FileServiceBlockingStub(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      super(channel, callOptions);
    }

    @java.lang.Override
    protected FileServiceBlockingStub build(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      return new FileServiceBlockingStub(channel, callOptions);
    }

    /**
     */
    public com.aiplatform.file.proto.FolderResponse createFolder(com.aiplatform.file.proto.CreateFolderRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getCreateFolderMethod(), getCallOptions(), request);
    }

    /**
     */
    public com.aiplatform.file.proto.FolderResponse updateFolder(com.aiplatform.file.proto.UpdateFolderRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getUpdateFolderMethod(), getCallOptions(), request);
    }

    /**
     */
    public com.aiplatform.file.proto.SimpleResponse deleteFolder(com.aiplatform.file.proto.DeleteFolderRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getDeleteFolderMethod(), getCallOptions(), request);
    }

    /**
     */
    public com.aiplatform.file.proto.SimpleResponse shareFolder(com.aiplatform.file.proto.ShareFolderRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getShareFolderMethod(), getCallOptions(), request);
    }

    /**
     */
    public com.aiplatform.file.proto.SimpleResponse unshareFolder(com.aiplatform.file.proto.UnshareFolderRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getUnshareFolderMethod(), getCallOptions(), request);
    }

    /**
     */
    public com.aiplatform.file.proto.ListFoldersResponse listMyFolders(com.aiplatform.file.proto.ListMyFoldersRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getListMyFoldersMethod(), getCallOptions(), request);
    }

    /**
     */
    public com.aiplatform.file.proto.ListFoldersResponse listSharedFolders(com.aiplatform.file.proto.ListSharedFoldersRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getListSharedFoldersMethod(), getCallOptions(), request);
    }

    /**
     */
    public com.aiplatform.file.proto.FileResponse uploadFile(com.aiplatform.file.proto.UploadFileRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getUploadFileMethod(), getCallOptions(), request);
    }

    /**
     */
    public com.aiplatform.file.proto.FileResponse getFileMetadata(com.aiplatform.file.proto.GetFileRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getGetFileMetadataMethod(), getCallOptions(), request);
    }

    /**
     */
    public com.aiplatform.file.proto.SimpleResponse deleteFile(com.aiplatform.file.proto.DeleteFileRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getDeleteFileMethod(), getCallOptions(), request);
    }

    /**
     */
    public com.aiplatform.file.proto.SimpleResponse shareFile(com.aiplatform.file.proto.ShareFileRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getShareFileMethod(), getCallOptions(), request);
    }

    /**
     */
    public com.aiplatform.file.proto.SimpleResponse unshareFile(com.aiplatform.file.proto.UnshareFileRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getUnshareFileMethod(), getCallOptions(), request);
    }

    /**
     */
    public com.aiplatform.file.proto.FileResponse updateFileMetadata(com.aiplatform.file.proto.UpdateFileMetadataRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getUpdateFileMetadataMethod(), getCallOptions(), request);
    }

    /**
     */
    public com.aiplatform.file.proto.ListFilesResponse listMyFiles(com.aiplatform.file.proto.ListMyFilesRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getListMyFilesMethod(), getCallOptions(), request);
    }

    /**
     */
    public com.aiplatform.file.proto.ListFilesResponse listSharedWithMe(com.aiplatform.file.proto.ListSharedWithMeRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getListSharedWithMeMethod(), getCallOptions(), request);
    }

    /**
     */
    public com.aiplatform.file.proto.FilePathResponse getFilePath(com.aiplatform.file.proto.GetFilePathRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getGetFilePathMethod(), getCallOptions(), request);
    }
  }

  /**
   * A stub to allow clients to do ListenableFuture-style rpc calls to service FileService.
   */
  public static final class FileServiceFutureStub
      extends io.grpc.stub.AbstractFutureStub<FileServiceFutureStub> {
    private FileServiceFutureStub(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      super(channel, callOptions);
    }

    @java.lang.Override
    protected FileServiceFutureStub build(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      return new FileServiceFutureStub(channel, callOptions);
    }

    /**
     */
    public com.google.common.util.concurrent.ListenableFuture<com.aiplatform.file.proto.FolderResponse> createFolder(
        com.aiplatform.file.proto.CreateFolderRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getCreateFolderMethod(), getCallOptions()), request);
    }

    /**
     */
    public com.google.common.util.concurrent.ListenableFuture<com.aiplatform.file.proto.FolderResponse> updateFolder(
        com.aiplatform.file.proto.UpdateFolderRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getUpdateFolderMethod(), getCallOptions()), request);
    }

    /**
     */
    public com.google.common.util.concurrent.ListenableFuture<com.aiplatform.file.proto.SimpleResponse> deleteFolder(
        com.aiplatform.file.proto.DeleteFolderRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getDeleteFolderMethod(), getCallOptions()), request);
    }

    /**
     */
    public com.google.common.util.concurrent.ListenableFuture<com.aiplatform.file.proto.SimpleResponse> shareFolder(
        com.aiplatform.file.proto.ShareFolderRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getShareFolderMethod(), getCallOptions()), request);
    }

    /**
     */
    public com.google.common.util.concurrent.ListenableFuture<com.aiplatform.file.proto.SimpleResponse> unshareFolder(
        com.aiplatform.file.proto.UnshareFolderRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getUnshareFolderMethod(), getCallOptions()), request);
    }

    /**
     */
    public com.google.common.util.concurrent.ListenableFuture<com.aiplatform.file.proto.ListFoldersResponse> listMyFolders(
        com.aiplatform.file.proto.ListMyFoldersRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getListMyFoldersMethod(), getCallOptions()), request);
    }

    /**
     */
    public com.google.common.util.concurrent.ListenableFuture<com.aiplatform.file.proto.ListFoldersResponse> listSharedFolders(
        com.aiplatform.file.proto.ListSharedFoldersRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getListSharedFoldersMethod(), getCallOptions()), request);
    }

    /**
     */
    public com.google.common.util.concurrent.ListenableFuture<com.aiplatform.file.proto.FileResponse> uploadFile(
        com.aiplatform.file.proto.UploadFileRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getUploadFileMethod(), getCallOptions()), request);
    }

    /**
     */
    public com.google.common.util.concurrent.ListenableFuture<com.aiplatform.file.proto.FileResponse> getFileMetadata(
        com.aiplatform.file.proto.GetFileRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getGetFileMetadataMethod(), getCallOptions()), request);
    }

    /**
     */
    public com.google.common.util.concurrent.ListenableFuture<com.aiplatform.file.proto.SimpleResponse> deleteFile(
        com.aiplatform.file.proto.DeleteFileRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getDeleteFileMethod(), getCallOptions()), request);
    }

    /**
     */
    public com.google.common.util.concurrent.ListenableFuture<com.aiplatform.file.proto.SimpleResponse> shareFile(
        com.aiplatform.file.proto.ShareFileRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getShareFileMethod(), getCallOptions()), request);
    }

    /**
     */
    public com.google.common.util.concurrent.ListenableFuture<com.aiplatform.file.proto.SimpleResponse> unshareFile(
        com.aiplatform.file.proto.UnshareFileRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getUnshareFileMethod(), getCallOptions()), request);
    }

    /**
     */
    public com.google.common.util.concurrent.ListenableFuture<com.aiplatform.file.proto.FileResponse> updateFileMetadata(
        com.aiplatform.file.proto.UpdateFileMetadataRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getUpdateFileMetadataMethod(), getCallOptions()), request);
    }

    /**
     */
    public com.google.common.util.concurrent.ListenableFuture<com.aiplatform.file.proto.ListFilesResponse> listMyFiles(
        com.aiplatform.file.proto.ListMyFilesRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getListMyFilesMethod(), getCallOptions()), request);
    }

    /**
     */
    public com.google.common.util.concurrent.ListenableFuture<com.aiplatform.file.proto.ListFilesResponse> listSharedWithMe(
        com.aiplatform.file.proto.ListSharedWithMeRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getListSharedWithMeMethod(), getCallOptions()), request);
    }

    /**
     */
    public com.google.common.util.concurrent.ListenableFuture<com.aiplatform.file.proto.FilePathResponse> getFilePath(
        com.aiplatform.file.proto.GetFilePathRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getGetFilePathMethod(), getCallOptions()), request);
    }
  }

  private static final int METHODID_CREATE_FOLDER = 0;
  private static final int METHODID_UPDATE_FOLDER = 1;
  private static final int METHODID_DELETE_FOLDER = 2;
  private static final int METHODID_SHARE_FOLDER = 3;
  private static final int METHODID_UNSHARE_FOLDER = 4;
  private static final int METHODID_LIST_MY_FOLDERS = 5;
  private static final int METHODID_LIST_SHARED_FOLDERS = 6;
  private static final int METHODID_UPLOAD_FILE = 7;
  private static final int METHODID_GET_FILE_METADATA = 8;
  private static final int METHODID_DELETE_FILE = 9;
  private static final int METHODID_SHARE_FILE = 10;
  private static final int METHODID_UNSHARE_FILE = 11;
  private static final int METHODID_UPDATE_FILE_METADATA = 12;
  private static final int METHODID_LIST_MY_FILES = 13;
  private static final int METHODID_LIST_SHARED_WITH_ME = 14;
  private static final int METHODID_GET_FILE_PATH = 15;

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
        case METHODID_CREATE_FOLDER:
          serviceImpl.createFolder((com.aiplatform.file.proto.CreateFolderRequest) request,
              (io.grpc.stub.StreamObserver<com.aiplatform.file.proto.FolderResponse>) responseObserver);
          break;
        case METHODID_UPDATE_FOLDER:
          serviceImpl.updateFolder((com.aiplatform.file.proto.UpdateFolderRequest) request,
              (io.grpc.stub.StreamObserver<com.aiplatform.file.proto.FolderResponse>) responseObserver);
          break;
        case METHODID_DELETE_FOLDER:
          serviceImpl.deleteFolder((com.aiplatform.file.proto.DeleteFolderRequest) request,
              (io.grpc.stub.StreamObserver<com.aiplatform.file.proto.SimpleResponse>) responseObserver);
          break;
        case METHODID_SHARE_FOLDER:
          serviceImpl.shareFolder((com.aiplatform.file.proto.ShareFolderRequest) request,
              (io.grpc.stub.StreamObserver<com.aiplatform.file.proto.SimpleResponse>) responseObserver);
          break;
        case METHODID_UNSHARE_FOLDER:
          serviceImpl.unshareFolder((com.aiplatform.file.proto.UnshareFolderRequest) request,
              (io.grpc.stub.StreamObserver<com.aiplatform.file.proto.SimpleResponse>) responseObserver);
          break;
        case METHODID_LIST_MY_FOLDERS:
          serviceImpl.listMyFolders((com.aiplatform.file.proto.ListMyFoldersRequest) request,
              (io.grpc.stub.StreamObserver<com.aiplatform.file.proto.ListFoldersResponse>) responseObserver);
          break;
        case METHODID_LIST_SHARED_FOLDERS:
          serviceImpl.listSharedFolders((com.aiplatform.file.proto.ListSharedFoldersRequest) request,
              (io.grpc.stub.StreamObserver<com.aiplatform.file.proto.ListFoldersResponse>) responseObserver);
          break;
        case METHODID_UPLOAD_FILE:
          serviceImpl.uploadFile((com.aiplatform.file.proto.UploadFileRequest) request,
              (io.grpc.stub.StreamObserver<com.aiplatform.file.proto.FileResponse>) responseObserver);
          break;
        case METHODID_GET_FILE_METADATA:
          serviceImpl.getFileMetadata((com.aiplatform.file.proto.GetFileRequest) request,
              (io.grpc.stub.StreamObserver<com.aiplatform.file.proto.FileResponse>) responseObserver);
          break;
        case METHODID_DELETE_FILE:
          serviceImpl.deleteFile((com.aiplatform.file.proto.DeleteFileRequest) request,
              (io.grpc.stub.StreamObserver<com.aiplatform.file.proto.SimpleResponse>) responseObserver);
          break;
        case METHODID_SHARE_FILE:
          serviceImpl.shareFile((com.aiplatform.file.proto.ShareFileRequest) request,
              (io.grpc.stub.StreamObserver<com.aiplatform.file.proto.SimpleResponse>) responseObserver);
          break;
        case METHODID_UNSHARE_FILE:
          serviceImpl.unshareFile((com.aiplatform.file.proto.UnshareFileRequest) request,
              (io.grpc.stub.StreamObserver<com.aiplatform.file.proto.SimpleResponse>) responseObserver);
          break;
        case METHODID_UPDATE_FILE_METADATA:
          serviceImpl.updateFileMetadata((com.aiplatform.file.proto.UpdateFileMetadataRequest) request,
              (io.grpc.stub.StreamObserver<com.aiplatform.file.proto.FileResponse>) responseObserver);
          break;
        case METHODID_LIST_MY_FILES:
          serviceImpl.listMyFiles((com.aiplatform.file.proto.ListMyFilesRequest) request,
              (io.grpc.stub.StreamObserver<com.aiplatform.file.proto.ListFilesResponse>) responseObserver);
          break;
        case METHODID_LIST_SHARED_WITH_ME:
          serviceImpl.listSharedWithMe((com.aiplatform.file.proto.ListSharedWithMeRequest) request,
              (io.grpc.stub.StreamObserver<com.aiplatform.file.proto.ListFilesResponse>) responseObserver);
          break;
        case METHODID_GET_FILE_PATH:
          serviceImpl.getFilePath((com.aiplatform.file.proto.GetFilePathRequest) request,
              (io.grpc.stub.StreamObserver<com.aiplatform.file.proto.FilePathResponse>) responseObserver);
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
          getCreateFolderMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.aiplatform.file.proto.CreateFolderRequest,
              com.aiplatform.file.proto.FolderResponse>(
                service, METHODID_CREATE_FOLDER)))
        .addMethod(
          getUpdateFolderMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.aiplatform.file.proto.UpdateFolderRequest,
              com.aiplatform.file.proto.FolderResponse>(
                service, METHODID_UPDATE_FOLDER)))
        .addMethod(
          getDeleteFolderMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.aiplatform.file.proto.DeleteFolderRequest,
              com.aiplatform.file.proto.SimpleResponse>(
                service, METHODID_DELETE_FOLDER)))
        .addMethod(
          getShareFolderMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.aiplatform.file.proto.ShareFolderRequest,
              com.aiplatform.file.proto.SimpleResponse>(
                service, METHODID_SHARE_FOLDER)))
        .addMethod(
          getUnshareFolderMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.aiplatform.file.proto.UnshareFolderRequest,
              com.aiplatform.file.proto.SimpleResponse>(
                service, METHODID_UNSHARE_FOLDER)))
        .addMethod(
          getListMyFoldersMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.aiplatform.file.proto.ListMyFoldersRequest,
              com.aiplatform.file.proto.ListFoldersResponse>(
                service, METHODID_LIST_MY_FOLDERS)))
        .addMethod(
          getListSharedFoldersMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.aiplatform.file.proto.ListSharedFoldersRequest,
              com.aiplatform.file.proto.ListFoldersResponse>(
                service, METHODID_LIST_SHARED_FOLDERS)))
        .addMethod(
          getUploadFileMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.aiplatform.file.proto.UploadFileRequest,
              com.aiplatform.file.proto.FileResponse>(
                service, METHODID_UPLOAD_FILE)))
        .addMethod(
          getGetFileMetadataMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.aiplatform.file.proto.GetFileRequest,
              com.aiplatform.file.proto.FileResponse>(
                service, METHODID_GET_FILE_METADATA)))
        .addMethod(
          getDeleteFileMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.aiplatform.file.proto.DeleteFileRequest,
              com.aiplatform.file.proto.SimpleResponse>(
                service, METHODID_DELETE_FILE)))
        .addMethod(
          getShareFileMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.aiplatform.file.proto.ShareFileRequest,
              com.aiplatform.file.proto.SimpleResponse>(
                service, METHODID_SHARE_FILE)))
        .addMethod(
          getUnshareFileMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.aiplatform.file.proto.UnshareFileRequest,
              com.aiplatform.file.proto.SimpleResponse>(
                service, METHODID_UNSHARE_FILE)))
        .addMethod(
          getUpdateFileMetadataMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.aiplatform.file.proto.UpdateFileMetadataRequest,
              com.aiplatform.file.proto.FileResponse>(
                service, METHODID_UPDATE_FILE_METADATA)))
        .addMethod(
          getListMyFilesMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.aiplatform.file.proto.ListMyFilesRequest,
              com.aiplatform.file.proto.ListFilesResponse>(
                service, METHODID_LIST_MY_FILES)))
        .addMethod(
          getListSharedWithMeMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.aiplatform.file.proto.ListSharedWithMeRequest,
              com.aiplatform.file.proto.ListFilesResponse>(
                service, METHODID_LIST_SHARED_WITH_ME)))
        .addMethod(
          getGetFilePathMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.aiplatform.file.proto.GetFilePathRequest,
              com.aiplatform.file.proto.FilePathResponse>(
                service, METHODID_GET_FILE_PATH)))
        .build();
  }

  private static abstract class FileServiceBaseDescriptorSupplier
      implements io.grpc.protobuf.ProtoFileDescriptorSupplier, io.grpc.protobuf.ProtoServiceDescriptorSupplier {
    FileServiceBaseDescriptorSupplier() {}

    @java.lang.Override
    public com.google.protobuf.Descriptors.FileDescriptor getFileDescriptor() {
      return com.aiplatform.file.proto.FileProto.getDescriptor();
    }

    @java.lang.Override
    public com.google.protobuf.Descriptors.ServiceDescriptor getServiceDescriptor() {
      return getFileDescriptor().findServiceByName("FileService");
    }
  }

  private static final class FileServiceFileDescriptorSupplier
      extends FileServiceBaseDescriptorSupplier {
    FileServiceFileDescriptorSupplier() {}
  }

  private static final class FileServiceMethodDescriptorSupplier
      extends FileServiceBaseDescriptorSupplier
      implements io.grpc.protobuf.ProtoMethodDescriptorSupplier {
    private final java.lang.String methodName;

    FileServiceMethodDescriptorSupplier(java.lang.String methodName) {
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
      synchronized (FileServiceGrpc.class) {
        result = serviceDescriptor;
        if (result == null) {
          serviceDescriptor = result = io.grpc.ServiceDescriptor.newBuilder(SERVICE_NAME)
              .setSchemaDescriptor(new FileServiceFileDescriptorSupplier())
              .addMethod(getCreateFolderMethod())
              .addMethod(getUpdateFolderMethod())
              .addMethod(getDeleteFolderMethod())
              .addMethod(getShareFolderMethod())
              .addMethod(getUnshareFolderMethod())
              .addMethod(getListMyFoldersMethod())
              .addMethod(getListSharedFoldersMethod())
              .addMethod(getUploadFileMethod())
              .addMethod(getGetFileMetadataMethod())
              .addMethod(getDeleteFileMethod())
              .addMethod(getShareFileMethod())
              .addMethod(getUnshareFileMethod())
              .addMethod(getUpdateFileMetadataMethod())
              .addMethod(getListMyFilesMethod())
              .addMethod(getListSharedWithMeMethod())
              .addMethod(getGetFilePathMethod())
              .build();
        }
      }
    }
    return result;
  }
}
