package com.aiplatform.chat.service;

import com.aiplatform.chat.config.GrpcFileClientProperties;
import com.aiplatform.chat.exception.InvalidChatOperationException;
import com.aiplatform.file.proto.FileServiceGrpc;
import com.aiplatform.file.proto.FileType;
import com.aiplatform.file.proto.UploadFileRequest;
import com.google.protobuf.ByteString;
import io.grpc.Metadata;
import io.grpc.stub.MetadataUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.devh.boot.grpc.client.inject.GrpcClient;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class FileServiceClient {

    private static final Metadata.Key<String> SERVICE_SECRET_KEY = Metadata.Key.of("x-service-secret", Metadata.ASCII_STRING_MARSHALLER);
    private static final Metadata.Key<String> USER_ID_KEY = Metadata.Key.of("x-user-id", Metadata.ASCII_STRING_MARSHALLER);
    private static final Metadata.Key<String> CORRELATION_ID_KEY = Metadata.Key.of("x-correlation-id", Metadata.ASCII_STRING_MARSHALLER);
    private static final Metadata.Key<String> INTERNAL_SOURCE_KEY = Metadata.Key.of("x-internal-source", Metadata.ASCII_STRING_MARSHALLER);

    @GrpcClient("file-service")
    private FileServiceGrpc.FileServiceBlockingStub fileStub;

    private final GrpcFileClientProperties grpcFileClientProperties;

    public UUID uploadChatFile(UUID senderUserId, String originalName, String contentType, byte[] content, String correlationId) {
        try {
            Metadata metadata = new Metadata();
            metadata.put(SERVICE_SECRET_KEY, grpcFileClientProperties.serviceSecret());
            metadata.put(USER_ID_KEY, senderUserId.toString());
            metadata.put(CORRELATION_ID_KEY, correlationId != null ? correlationId : UUID.randomUUID().toString());
            metadata.put(INTERNAL_SOURCE_KEY, "chat-service");

            UploadFileRequest request = UploadFileRequest.newBuilder()
                    .setFileType(FileType.DOCUMENT)
                    .setOriginalName(originalName != null ? originalName : "attachment")
                    .setContentType(contentType != null ? contentType : "application/octet-stream")
                    .setContent(ByteString.copyFrom(content))
                    .setIsShareable(false)
                    .build();

            var response = fileStub.withInterceptors(MetadataUtils.newAttachHeadersInterceptor(metadata))
                    .uploadFile(request);
            return UUID.fromString(response.getId());
        } catch (Exception e) {
            log.error("Failed to upload file via File Service. senderUserId={}", senderUserId, e);
            throw new InvalidChatOperationException("Failed to upload file: " + e.getMessage());
        }
    }
}
