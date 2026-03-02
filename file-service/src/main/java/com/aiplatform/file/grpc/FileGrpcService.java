package com.aiplatform.file.grpc;

import com.aiplatform.file.domain.FileEntity;
import com.aiplatform.file.domain.FileType;
import com.aiplatform.file.proto.CreateFolderRequest;
import com.aiplatform.file.proto.DeleteFolderRequest;
import com.aiplatform.file.proto.DeleteFileRequest;
import com.aiplatform.file.proto.FilePathResponse;
import com.aiplatform.file.proto.FileResponse;
import com.aiplatform.file.proto.FileServiceGrpc;
import com.aiplatform.file.proto.FolderResponse;
import com.aiplatform.file.proto.GetFilePathRequest;
import com.aiplatform.file.proto.GetFileRequest;
import com.aiplatform.file.proto.ListFoldersResponse;
import com.aiplatform.file.proto.ListMyFoldersRequest;
import com.aiplatform.file.proto.ListFilesResponse;
import com.aiplatform.file.proto.ListMyFilesRequest;
import com.aiplatform.file.proto.ListSharedFoldersRequest;
import com.aiplatform.file.proto.ListSharedWithMeRequest;
import com.aiplatform.file.proto.ShareFolderRequest;
import com.aiplatform.file.proto.ShareFileRequest;
import com.aiplatform.file.proto.SimpleResponse;
import com.aiplatform.file.proto.UnshareFolderRequest;
import com.aiplatform.file.proto.UnshareFileRequest;
import com.aiplatform.file.proto.UpdateFolderRequest;
import com.aiplatform.file.proto.UpdateFileMetadataRequest;
import com.aiplatform.file.proto.UploadFileRequest;
import com.aiplatform.file.grpc.util.FileGrpcExceptionMapper;
import com.aiplatform.file.grpc.util.FileGrpcPrincipalResolver;
import com.aiplatform.file.grpc.util.FileGrpcResponseMapper;
import com.aiplatform.file.grpc.util.FolderGrpcResponseMapper;
import com.aiplatform.file.service.AuthenticatedPrincipal;
import com.aiplatform.file.service.FileApplicationService;
import com.aiplatform.file.service.FolderApplicationService;
import io.grpc.stub.StreamObserver;
import lombok.RequiredArgsConstructor;
import net.devh.boot.grpc.server.service.GrpcService;

import java.util.UUID;

@GrpcService
@RequiredArgsConstructor
public class FileGrpcService extends FileServiceGrpc.FileServiceImplBase {

    private final FileApplicationService fileApplicationService;
    private final FolderApplicationService folderApplicationService;

    @Override
    public void createFolder(CreateFolderRequest request, StreamObserver<FolderResponse> responseObserver) {
        try {
            AuthenticatedPrincipal principal = FileGrpcPrincipalResolver.requirePrincipal();
            var folder = folderApplicationService.createFolder(request.getName(), request.getParentId(), principal);
            responseObserver.onNext(FolderGrpcResponseMapper.toResponse(folder));
            responseObserver.onCompleted();
        } catch (Exception exception) {
            responseObserver.onError(FileGrpcExceptionMapper.toStatusException(exception));
        }
    }

    @Override
    public void updateFolder(UpdateFolderRequest request, StreamObserver<FolderResponse> responseObserver) {
        try {
            AuthenticatedPrincipal principal = FileGrpcPrincipalResolver.requirePrincipal();
            var folder = folderApplicationService.updateFolder(UUID.fromString(request.getFolderId()), request.getName(), principal);
            responseObserver.onNext(FolderGrpcResponseMapper.toResponse(folder));
            responseObserver.onCompleted();
        } catch (Exception exception) {
            responseObserver.onError(FileGrpcExceptionMapper.toStatusException(exception));
        }
    }

    @Override
    public void deleteFolder(DeleteFolderRequest request, StreamObserver<SimpleResponse> responseObserver) {
        try {
            AuthenticatedPrincipal principal = FileGrpcPrincipalResolver.requirePrincipal();
            folderApplicationService.deleteFolder(UUID.fromString(request.getFolderId()), principal);
            responseObserver.onNext(SimpleResponse.newBuilder().setMessage("Folder deleted").build());
            responseObserver.onCompleted();
        } catch (Exception exception) {
            responseObserver.onError(FileGrpcExceptionMapper.toStatusException(exception));
        }
    }

    @Override
    public void shareFolder(ShareFolderRequest request, StreamObserver<SimpleResponse> responseObserver) {
        try {
            AuthenticatedPrincipal principal = FileGrpcPrincipalResolver.requirePrincipal();
            folderApplicationService.shareFolder(
                    UUID.fromString(request.getFolderId()),
                    UUID.fromString(request.getSharedWithUserId()),
                    principal
            );
            responseObserver.onNext(SimpleResponse.newBuilder().setMessage("Folder shared").build());
            responseObserver.onCompleted();
        } catch (Exception exception) {
            responseObserver.onError(FileGrpcExceptionMapper.toStatusException(exception));
        }
    }

    @Override
    public void unshareFolder(UnshareFolderRequest request, StreamObserver<SimpleResponse> responseObserver) {
        try {
            AuthenticatedPrincipal principal = FileGrpcPrincipalResolver.requirePrincipal();
            folderApplicationService.unshareFolder(
                    UUID.fromString(request.getFolderId()),
                    UUID.fromString(request.getSharedWithUserId()),
                    principal
            );
            responseObserver.onNext(SimpleResponse.newBuilder().setMessage("Folder unshared").build());
            responseObserver.onCompleted();
        } catch (Exception exception) {
            responseObserver.onError(FileGrpcExceptionMapper.toStatusException(exception));
        }
    }

    @Override
    public void listMyFolders(ListMyFoldersRequest request, StreamObserver<ListFoldersResponse> responseObserver) {
        try {
            AuthenticatedPrincipal principal = FileGrpcPrincipalResolver.requirePrincipal();
            var foldersPage = folderApplicationService.listMyFolders(
                    principal,
                    request.getPage(),
                    request.getSize() == 0 ? 20 : request.getSize()
            );

            ListFoldersResponse.Builder builder = ListFoldersResponse.newBuilder().setTotal(foldersPage.getTotalElements());
            foldersPage.getContent().forEach(folder -> builder.addFolders(FolderGrpcResponseMapper.toResponse(folder)));
            responseObserver.onNext(builder.build());
            responseObserver.onCompleted();
        } catch (Exception exception) {
            responseObserver.onError(FileGrpcExceptionMapper.toStatusException(exception));
        }
    }

    @Override
    public void listSharedFolders(ListSharedFoldersRequest request, StreamObserver<ListFoldersResponse> responseObserver) {
        try {
            AuthenticatedPrincipal principal = FileGrpcPrincipalResolver.requirePrincipal();
            var foldersPage = folderApplicationService.listSharedFolders(
                    principal,
                    request.getPage(),
                    request.getSize() == 0 ? 20 : request.getSize()
            );

            ListFoldersResponse.Builder builder = ListFoldersResponse.newBuilder().setTotal(foldersPage.getTotalElements());
            foldersPage.getContent().forEach(folder -> builder.addFolders(FolderGrpcResponseMapper.toResponse(folder)));
            responseObserver.onNext(builder.build());
            responseObserver.onCompleted();
        } catch (Exception exception) {
            responseObserver.onError(FileGrpcExceptionMapper.toStatusException(exception));
        }
    }

    @Override
    public void uploadFile(UploadFileRequest request, StreamObserver<FileResponse> responseObserver) {
        try {
            AuthenticatedPrincipal principal = FileGrpcPrincipalResolver.requirePrincipal();
            String internalSource = GrpcContextKeys.INTERNAL_SOURCE.get();

            UUID folderId = null;
            if (request.getFolderId() != null && !request.getFolderId().isBlank()) {
                folderId = UUID.fromString(request.getFolderId());
            }

            FileEntity saved = fileApplicationService.uploadFile(
                    principal,
                    FileType.valueOf(request.getFileType().name()),
                    request.getOriginalName(),
                    request.getContentType(),
                    request.getContent().toByteArray(),
                    request.getIsShareable(),
                    folderId,
                    internalSource
            );
            responseObserver.onNext(FileGrpcResponseMapper.toResponse(saved));
            responseObserver.onCompleted();
        } catch (Exception exception) {
            responseObserver.onError(FileGrpcExceptionMapper.toStatusException(exception));
        }
    }

    @Override
    public void getFileMetadata(GetFileRequest request, StreamObserver<FileResponse> responseObserver) {
        try {
            AuthenticatedPrincipal principal = FileGrpcPrincipalResolver.requirePrincipal();
            FileEntity file = fileApplicationService.getMetadata(UUID.fromString(request.getFileId()), principal);
            responseObserver.onNext(FileGrpcResponseMapper.toResponse(file));
            responseObserver.onCompleted();
        } catch (Exception exception) {
            responseObserver.onError(FileGrpcExceptionMapper.toStatusException(exception));
        }
    }

    @Override
    public void deleteFile(DeleteFileRequest request, StreamObserver<SimpleResponse> responseObserver) {
        try {
            AuthenticatedPrincipal principal = FileGrpcPrincipalResolver.requirePrincipal();
            fileApplicationService.deleteFile(UUID.fromString(request.getFileId()), principal);
            responseObserver.onNext(SimpleResponse.newBuilder().setMessage("File deleted").build());
            responseObserver.onCompleted();
        } catch (Exception exception) {
            responseObserver.onError(FileGrpcExceptionMapper.toStatusException(exception));
        }
    }

    @Override
    public void shareFile(ShareFileRequest request, StreamObserver<SimpleResponse> responseObserver) {
        try {
            AuthenticatedPrincipal principal = FileGrpcPrincipalResolver.requirePrincipal();
            fileApplicationService.shareFile(
                    UUID.fromString(request.getFileId()),
                    UUID.fromString(request.getSharedWithUserId()),
                    principal
            );
            responseObserver.onNext(SimpleResponse.newBuilder().setMessage("File shared").build());
            responseObserver.onCompleted();
        } catch (Exception exception) {
            responseObserver.onError(FileGrpcExceptionMapper.toStatusException(exception));
        }
    }

    @Override
    public void unshareFile(UnshareFileRequest request, StreamObserver<SimpleResponse> responseObserver) {
        try {
            AuthenticatedPrincipal principal = FileGrpcPrincipalResolver.requirePrincipal();
            fileApplicationService.unshareFile(
                    UUID.fromString(request.getFileId()),
                    UUID.fromString(request.getSharedWithUserId()),
                    principal
            );
            responseObserver.onNext(SimpleResponse.newBuilder().setMessage("File unshared").build());
            responseObserver.onCompleted();
        } catch (Exception exception) {
            responseObserver.onError(FileGrpcExceptionMapper.toStatusException(exception));
        }
    }

    @Override
    public void updateFileMetadata(UpdateFileMetadataRequest request, StreamObserver<FileResponse> responseObserver) {
        try {
            AuthenticatedPrincipal principal = FileGrpcPrincipalResolver.requirePrincipal();
            FileEntity updated = fileApplicationService.updateFileMetadata(
                    UUID.fromString(request.getFileId()),
                    request.getIsShareable(),
                    principal
            );
            responseObserver.onNext(FileGrpcResponseMapper.toResponse(updated));
            responseObserver.onCompleted();
        } catch (Exception exception) {
            responseObserver.onError(FileGrpcExceptionMapper.toStatusException(exception));
        }
    }

    @Override
    public void listMyFiles(ListMyFilesRequest request, StreamObserver<ListFilesResponse> responseObserver) {
        try {
            AuthenticatedPrincipal principal = FileGrpcPrincipalResolver.requirePrincipal();
            FileType filterType = null;
            if (request.getFilterByType()) {
                filterType = FileType.valueOf(request.getFileType().name());
            }
            var filesPage = fileApplicationService.listMyFiles(
                    principal,
                    request.getPage(),
                    request.getSize() == 0 ? 20 : request.getSize(),
                    filterType,
                    request.getIncludeDeleted()
            );

            ListFilesResponse.Builder builder = ListFilesResponse.newBuilder().setTotal(filesPage.getTotalElements());
            filesPage.getContent().forEach(file -> builder.addFiles(FileGrpcResponseMapper.toResponse(file)));
            responseObserver.onNext(builder.build());
            responseObserver.onCompleted();
        } catch (Exception exception) {
            responseObserver.onError(FileGrpcExceptionMapper.toStatusException(exception));
        }
    }

    @Override
    public void listSharedWithMe(ListSharedWithMeRequest request, StreamObserver<ListFilesResponse> responseObserver) {
        try {
            AuthenticatedPrincipal principal = FileGrpcPrincipalResolver.requirePrincipal();
            var filesPage = fileApplicationService.listSharedWithMe(
                    principal,
                    request.getPage(),
                    request.getSize() == 0 ? 20 : request.getSize()
            );

            ListFilesResponse.Builder builder = ListFilesResponse.newBuilder().setTotal(filesPage.getTotalElements());
            filesPage.getContent().forEach(file -> builder.addFiles(FileGrpcResponseMapper.toResponse(file)));
            responseObserver.onNext(builder.build());
            responseObserver.onCompleted();
        } catch (Exception exception) {
            responseObserver.onError(FileGrpcExceptionMapper.toStatusException(exception));
        }
    }

    @Override
    public void getFilePath(GetFilePathRequest request, StreamObserver<FilePathResponse> responseObserver) {
        try {
            AuthenticatedPrincipal principal = FileGrpcPrincipalResolver.requirePrincipal();
            UUID fileId = UUID.fromString(request.getFileId());
            String path = fileApplicationService.getFilePath(fileId, principal);
            responseObserver.onNext(FilePathResponse.newBuilder().setFileId(fileId.toString()).setAbsolutePath(path).build());
            responseObserver.onCompleted();
        } catch (Exception exception) {
            responseObserver.onError(FileGrpcExceptionMapper.toStatusException(exception));
        }
    }
}
