Below is a **backend-focused instruction document** you can give to an AI agent to refactor your system. It assumes the current architecture you described: **Spring Boot API Gateway → gRPC → Spring Boot File Service**, with **Kafka already available**.

The design moves from **Base64 request upload** → **true streaming upload** to eliminate memory pressure and enable resumable uploads.

---

# FIX_FILE_UPLOAD.md

## Objective

Refactor the current **File Upload pipeline** in the AI Learning Platform to support **streaming file uploads instead of Base64 payload uploads**.

The current implementation transfers the entire file as a **Base64 encoded string in a JSON request**, which introduces several problems:

* High memory usage in API Gateway
* Base64 increases payload size by ~33%
* Entire file must be loaded into memory
* Large file uploads become unreliable
* Upload interruptions require full restart

The refactor must implement **chunked streaming upload over gRPC**, with optional **Kafka-based resumable upload coordination**.

This change affects only the **backend services**:

* API Gateway (Spring Boot + WebFlux)
* File Service (Spring Boot + gRPC)
* Kafka (optional resumable support)

Frontend changes are **out of scope for now**.

---

# Current Flow (To Be Removed)

Current flow:

```
Client
  -> REST POST /files
      JSON {contentBase64}
        -> API Gateway
            decode Base64
              -> gRPC uploadFile(byte[])
                   -> File Service
                       write entire file
```

Problems:

* Entire file held in memory
* No resumable capability
* No streaming
* Unstable for large files

---

# Target Architecture

New upload pipeline:

```
Client
  -> REST Upload Stream
       -> API Gateway
            stream chunks
               -> gRPC Streaming
                    -> File Service
                         write chunks to disk
```

Optional resumable design:

```
Client
   -> Upload Session
       -> Kafka upload state
       -> Resume if interrupted
```

---

# Required Changes

## 1. Remove Base64 Upload

The following components must be removed or deprecated:

### API Gateway

Remove usage of:

```
FileUploadRequest.contentBase64
Base64.getDecoder().decode()
ByteString.copyFrom(content)
```

The gateway must **no longer buffer the entire file**.

---

# 2. Introduce Streaming gRPC API

Modify the **file-service protobuf**.

### New Upload Protocol

Define a **client streaming RPC**.

```proto
service FileService {

  rpc UploadFileStream(stream UploadFileChunk)
      returns (UploadFileResponse);

}
```

---

## UploadFileChunk Message

```
message UploadFileChunk {

  string uploadId = 1;

  string fileName = 2;

  string contentType = 3;

  string fileType = 4;

  string folderId = 5;

  bool isShareable = 6;

  bytes chunkData = 7;

  int64 chunkIndex = 8;

  bool lastChunk = 9;

}
```

Notes:

* Metadata only required in the **first chunk**
* `chunkIndex` ensures ordering
* `uploadId` identifies upload session

---

# 3. API Gateway Refactor

## Replace REST Endpoint

Current:

```
@PostMapping
Mono<ResponseEntity<FileResponse>> uploadFile(...)
```

New endpoint must support **streamed upload**.

Recommended:

```
@PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
```

Accept:

```
file: FilePart
folderId
fileType
isShareable
```

---

## Stream File Content

Use **Spring WebFlux streaming**.

Example design pattern:

```
filePart.content()
    .map(DataBuffer)
    -> convert to byte[]
    -> send to gRPC stream
```

Pseudo flow:

```
Flux<DataBuffer>
   -> chunk bytes
       -> UploadFileChunk
           -> grpcClientStream.onNext()
```

Gateway **must not buffer the entire file**.

---

## Gateway gRPC Streaming Client

Use **FileServiceStub (async)** instead of BlockingStub.

```
FileServiceGrpc.FileServiceStub
```

Create streaming call:

```
StreamObserver<UploadFileChunk> requestObserver
```

For every chunk:

```
requestObserver.onNext(chunk)
```

When finished:

```
requestObserver.onCompleted()
```

Return response when server responds.

---

# 4. File Service Streaming Implementation

Replace the current `uploadFile()` logic with **streaming chunk aggregation**.

Create a new gRPC method handler:

```
public StreamObserver<UploadFileChunk> uploadFileStream(
    StreamObserver<UploadFileResponse> responseObserver
)
```

---

## Streaming Write Logic

Instead of:

```
writeFile(targetPath, content)
```

Use incremental file writes.

Pseudo logic:

```
onNext(chunk):

   if first chunk:
       create upload session
       resolve folder
       create temp file

   append chunkData to temp file

   update bytes written
```

Use:

```
Files.write(
    path,
    chunk,
    StandardOpenOption.CREATE,
    StandardOpenOption.APPEND
)
```

---

## On Stream Completion

When `lastChunk == true`:

1. finalize file
2. calculate final size
3. store FileEntity
4. publish file uploaded event

Call:

```
fileEventPublisher.publishUploaded(saved)
```

---

# 5. Temporary File Storage

Uploads must be written to **temporary files first**.

Directory:

```
/storage/tmp-uploads/
```

Example:

```
tmp/{uploadId}.part
```

After completion:

```
move -> final folder location
```

Use:

```
Files.move(...)
```

This prevents partially written files appearing as valid files.

---

# 6. Kafka-Based Resumable Upload (Optional but Recommended)

Use Kafka to store **upload progress events**.

Topic:

```
file-upload-progress
```

Event example:

```
UploadProgressEvent
{
  uploadId
  userId
  chunkIndex
  bytesReceived
  timestamp
}
```

Purpose:

* allow **upload resume**
* detect incomplete uploads
* audit upload failures

---

## Upload Resume Logic

When client reconnects:

```
GET /files/upload/status/{uploadId}
```

Gateway checks Kafka or DB:

```
highestChunkIndex
```

Client resumes from next chunk.

---

# 7. Upload Session Tracking

Introduce a new entity:

```
UploadSession
```

Fields:

```
uploadId
userId
folderId
fileName
contentType
bytesUploaded
status
createdAt
updatedAt
```

Statuses:

```
IN_PROGRESS
COMPLETED
FAILED
```

Store in database or Redis.

---

# 8. Error Handling

Streaming introduces new failure cases.

Handle:

### Interrupted Connection

If stream ends unexpectedly:

```
status = FAILED
retain temp file
```

### Duplicate Chunk

Ignore if:

```
chunkIndex <= lastSavedChunk
```

### Out-of-order Chunk

Reject upload.

---

# 9. Security

Preserve the existing authentication model.

Gateway still validates:

```
Authorization header
```

Principal must be injected into metadata:

```
x-user-id
x-correlation-id
```

File service must verify ownership for folder uploads.

---

# 10. Metrics

Add metrics:

```
file.upload.stream.started
file.upload.stream.completed
file.upload.stream.failed
file.upload.bytes.received
```

Use existing `MeterRegistry`.

---

# 11. Backward Compatibility

Temporarily keep the old endpoint:

```
/files/base64-upload
```

Mark as:

```
@Deprecated
```

This allows gradual migration.

---

# 12. Final Expected Flow

Final upload pipeline:

```
Client
  -> multipart upload
       -> API Gateway
            stream chunks
                -> gRPC UploadFileStream
                     -> File Service
                         write chunks to temp file
                         finalize file
                         publish event
```

Memory usage becomes **constant regardless of file size**.

---

# Implementation Priority

Order of implementation:

1. gRPC streaming proto
2. File Service streaming handler
3. Temp file writing
4. API Gateway streaming client
5. Multipart streaming endpoint
6. Upload session tracking
7. Kafka upload progress (optional)

---

If you'd like, I can also produce a **COMPLETE PRODUCTION-GRADE PROTO FILE + Java streaming implementations for both services**, which will save you a large amount of development time.
