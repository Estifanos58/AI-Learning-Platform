# INSTRUCTION_FOR_CLEINT.md

## API Gateway Client Integration Guide

This document is the frontend/client contract for communicating with the API Gateway.

---

## 1) Base URL and Routing

- Local base URL: `http://localhost:8081`
- If deployed, replace host with gateway host: `http(s)://<gateway-host>:8081`
- Client must call **public routes** only:
  - `/api/auth/**`
  - `/api/profile/**`
  - `/api/files/**`
  - `/api/chat/**`
- Do **not** call `/api/internal/**` directly (internal rewrite target only).

---

## 2) Common Headers

### Required for most endpoints
- `Content-Type: application/json` (for endpoints with JSON body)
- `Accept: application/json` (recommended)
- `Authorization: Bearer <access_token>` (required for `/api/profile/**`, `/api/files/**`, `/api/chat/**`)

### Optional but strongly recommended
- `X-Correlation-ID: <uuid-or-trace-id>`
  - If present, gateway propagates it and returns it on error responses.

---

## 3) Standard Response Behavior

### Success responses
- Status is usually `200 OK`
- Response body type depends on endpoint (see endpoint sections below)

### Error responses (all endpoints)
All failures return this shape:

```json
{
  "timestamp": "2026-03-04T12:34:56Z",
  "status": 400,
  "error": "Bad Request",
  "code": "VALIDATION_FAILED",
  "message": "Request validation failed",
  "path": "/api/auth/signup",
  "correlationId": "c8e2f3f0-2ab9-4f73-88a6-2ba0d8b6a2cd",
  "details": {
    "email": "must be a well-formed email address"
  }
}
```

Error model fields:
- `timestamp: string` (ISO-8601)
- `status: number` (HTTP status)
- `error: string` (HTTP reason phrase)
- `code: string` (machine-friendly app error code)
- `message: string` (safe client message)
- `path: string` (requested path)
- `correlationId: string` (trace id)
- `details: object<string,string>` (field-level validation errors; may be empty)

Typical status/code:
- `400` → `VALIDATION_FAILED`, `MALFORMED_REQUEST`, `BAD_REQUEST`
- `401` → `UNAUTHORIZED`
- `403` → `FORBIDDEN`
- `404` → `NOT_FOUND`
- `409` → `CONFLICT`
- `429` → `RATE_LIMITED`
- `502` → `UPSTREAM_ERROR`
- `503` → `SERVICE_UNAVAILABLE`
- `504` → `UPSTREAM_TIMEOUT`
- `500` → `INTERNAL_ERROR`

---

## 4) Shared Data Types

### Enums used by requests/responses
- `Role` (signup/user summary): `STUDENT | INSTRUCTOR | ADMIN`
- `FileType` (file upload/list filter/file response): gateway proto enum (commonly `PROFILE_IMAGE`, `DOCUMENT`)
- `ProfileVisibility` (profile): `PUBLIC | UNIVERSITY_ONLY | PRIVATE`

### Core response objects

#### `ApiMessageResponse`
```json
{ "message": "string" }
```

#### `AuthResponse`
```json
{
  "message": "string",
  "accessToken": "string",
  "refreshToken": "string",
  "tokenType": "string",
  "accessTokenExpiresInSeconds": 3600,
  "user": {
    "id": "string",
    "email": "string",
    "username": "string",
    "role": "STUDENT",
    "status": "ACTIVE",
    "emailVerified": true
  }
}
```

#### `FolderResponse`
```json
{
  "id": "string",
  "ownerId": "string",
  "name": "string",
  "parentId": "string",
  "deleted": false,
  "createdAt": "string",
  "updatedAt": "string"
}
```

#### `FileResponse`
```json
{
  "id": "string",
  "ownerId": "string",
  "folderId": "string",
  "fileType": "DOCUMENT",
  "originalName": "lecture.pdf",
  "storedName": "stored-uuid.pdf",
  "contentType": "application/pdf",
  "fileSize": 12345,
  "storagePath": "/path/or/key",
  "isShareable": true,
  "deleted": false,
  "createdAt": "string",
  "updatedAt": "string"
}
```

#### `UserProfileResponse`
```json
{
  "userId": "string",
  "firstName": "string",
  "lastName": "string",
  "universityId": "string",
  "department": "string",
  "bio": "string",
  "profileImageFileId": "string",
  "visibility": "PUBLIC",
  "reputationScore": 0,
  "completionScore": 0,
  "createdAt": "string",
  "updatedAt": "string"
}
```

#### Chat response objects
- `ChatMessageResponse`: `id, chatroomId, senderUserId, aiModelId, content, fileId, createdAt`
- `ChatroomDto`: `id, type, memberIds[], createdAt`
- `SendChatMessageResponse`: `{ message: ChatMessageResponse, chatroomId: string, isNewChatroom: boolean }`
- `List*` responses include array + `total`

---

## 5) Auth Endpoints (`/api/auth/*`) — No Bearer Token Required

## POST `/api/auth/signup`
- Headers: `Content-Type`, optional `X-Correlation-ID`
- Body:
```json
{
  "email": "user@example.com",
  "username": "estifanos",
  "password": "password123",
  "role": "STUDENT"
}
```
- Validation:
  - `email`: required, valid email
  - `username`: required, max 100
  - `password`: required, 8..128
  - `role`: required
- Success: `200` `AuthResponse`

## POST `/api/auth/login`
- Body:
```json
{ "email": "user@example.com", "password": "password123" }
```
- Validation: email required+valid, password required
- Success: `200` `AuthResponse`

## POST `/api/auth/verify-email`
- Body:
```json
{ "token": "verification-token" }
```
- Validation: token required
- Success: `200` `ApiMessageResponse`

## POST `/api/auth/refresh`
- Body:
```json
{ "refreshToken": "refresh-token" }
```
- Validation: refreshToken required
- Success: `200` `AuthResponse`

## POST `/api/auth/logout`
- Body:
```json
{ "refreshToken": "refresh-token" }
```
- Validation: refreshToken required
- Success: `200` `ApiMessageResponse`

---

## 6) Profile Endpoints (`/api/profile/*`) — Bearer Token Required

## GET `/api/profile/me`
- Headers: `Authorization: Bearer <access_token>`
- Success: `200` `UserProfileResponse`

## GET `/api/profile/{userId}`
- Path params: `userId: string`
- Success: `200` `UserProfileResponse`

## PUT `/api/profile/me`
- Body (all fields optional, partial update supported):
```json
{
  "firstName": "string",
  "lastName": "string",
  "universityId": "string",
  "department": "string",
  "bio": "string",
  "profileImageFileId": "string"
}
```
- Validation:
  - `firstName` max 100
  - `lastName` max 100
  - `universityId` max 50
  - `department` max 100
  - `bio` max 2000
- Success: `200` `UserProfileResponse`

## GET `/api/profile/search`
- Query params (all optional unless noted):
  - `universityId: string`
  - `department: string`
  - `nameQuery: string`
  - `page: int` (default `0`)
  - `size: int` (default `20`)
- Success: `200`
```json
{ "profiles": [UserProfileResponse], "total": 0 }
```

## PATCH `/api/profile/visibility`
- Body:
```json
{ "visibility": "PUBLIC" }
```
- Validation: visibility required enum
- Success: `200` `ApiMessageResponse`

## POST `/api/profile/reputation`
- Body:
```json
{ "userId": "string", "amount": 10 }
```
- Validation: `userId` required, `amount >= 0`
- Authorization: requires admin role
- Success: `200` `ApiMessageResponse`

---

## 7) File Endpoints (`/api/files/*`) — Bearer Token Required

## POST `/api/files`
- Purpose: upload file metadata + content
- Body:
```json
{
  "fileType": "DOCUMENT",
  "folderId": "folder-id",
  "originalName": "lecture.pdf",
  "contentType": "application/pdf",
  "contentBase64": "<base64-content>",
  "isShareable": true
}
```
- Validation: `fileType, folderId, originalName, contentBase64` required
- Success: `200` `FileResponse`

## POST `/api/files/folders`
- Body:
```json
{ "name": "Math", "parentId": "optional-parent-folder-id" }
```
- Validation: `name` required
- Success: `200` `FolderResponse`

## PUT `/api/files/folders/{folderId}`
- Body:
```json
{ "name": "New Folder Name" }
```
- Validation: `name` required
- Success: `200` `FolderResponse`

## DELETE `/api/files/folders/{folderId}`
- Success: `200` `ApiMessageResponse`

## POST `/api/files/folders/{folderId}/share`
- Body:
```json
{ "sharedWithUserId": "target-user-id" }
```
- Validation: required `sharedWithUserId`
- Success: `200` `ApiMessageResponse`

## DELETE `/api/files/folders/{folderId}/share/{userId}`
- Success: `200` `ApiMessageResponse`

## GET `/api/files/folders`
- Query: `page` (default 0), `size` (default 20)
- Success: `200`
```json
{ "folders": [FolderResponse], "total": 0 }
```

## GET `/api/files/folders/shared`
- Query: `page` (default 0), `size` (default 20)
- Success: `200`
```json
{ "folders": [FolderResponse], "total": 0 }
```

## GET `/api/files/{fileId}`
- Success: `200` `FileResponse`

## DELETE `/api/files/{fileId}`
- Success: `200` `ApiMessageResponse`

## POST `/api/files/{fileId}/share`
- Body:
```json
{ "sharedWithUserId": "target-user-id" }
```
- Success: `200` `ApiMessageResponse`

## POST `/api/files/{fileId}/unshare`
- Body:
```json
{ "sharedWithUserId": "target-user-id" }
```
- Success: `200` `ApiMessageResponse`

## PATCH `/api/files/{fileId}/metadata`
- Body:
```json
{ "isShareable": true }
```
- Success: `200` `FileResponse`

## GET `/api/files/my`
- Query params:
  - `page: int` (default `0`)
  - `size: int` (default `20`)
  - `fileType: FileType` (optional)
  - `includeDeleted: boolean` (default `false`)
- Success: `200`
```json
{ "files": [FileResponse], "total": 0 }
```

## GET `/api/files/shared-with-me`
- Query: `page` (default 0), `size` (default 20)
- Success: `200`
```json
{ "files": [FileResponse], "total": 0 }
```

## GET `/api/files/{fileId}/path`
- Success: `200` plain `string` response body (absolute file path)

---

## 8) Chat Endpoints (`/api/chat/*`) — Bearer Token Required

## POST `/api/chat/messages`
- Body:
```json
{
  "otherUserId": "optional-user-id",
  "chatroomId": "optional-chatroom-id",
  "aiModelId": "optional-model-id",
  "content": "optional-message-text",
  "fileId": "optional-existing-file-id",
  "fileBase64": "optional-base64-attachment",
  "fileOriginalName": "optional-file-name",
  "fileContentType": "optional-mime-type"
}
```
- Notes:
  - Fields are optional at DTO level; backend business rules may require at least one of content/file/chat context.
  - If `fileBase64` is provided it must be valid Base64.
- Success: `200`
```json
{
  "message": ChatMessageResponse,
  "chatroomId": "string",
  "isNewChatroom": false
}
```

## GET `/api/chat/chatrooms/{chatroomId}`
- Success: `200` `ChatroomDto`

## GET `/api/chat/chatrooms`
- Query: `page` (default 0), `size` (default 20)
- Success: `200`
```json
{ "chatrooms": [ChatroomDto], "total": 0 }
```

## GET `/api/chat/chatrooms/{chatroomId}/messages`
- Query: `page` (default 0), `size` (default 20)
- Success: `200`
```json
{ "messages": [ChatMessageResponse], "total": 0 }
```

## POST `/api/chat/chatrooms/{chatroomId}/typing`
- Query: `isTyping: boolean` (optional, default `true`)
- Success: `200` `ApiMessageResponse` (message is `"OK"`)

---

## 9) Client-Side Implementation Rules (Recommended)

- Always send `Authorization` for non-auth routes.
- Always parse errors using `ApiErrorResponse`.
- Use `status + code` to drive client logic, not only `message`.
- Log/store `correlationId` with failed requests for support/debug.
- Handle `429 RATE_LIMITED` with retry/backoff strategy.
- Treat `5xx` messages as generic and show user-safe fallback text.

---

## 10) Reference

- Response scenarios matrix: `api-gateway/RESPONSE_SCENARIOS.md`
- Error model source: `api-gateway/src/main/java/com/aiplatform/gateway/dto/ApiErrorResponse.java`
- Global exception mapping: `api-gateway/src/main/java/com/aiplatform/gateway/exception/GatewayExceptionHandler.java`
