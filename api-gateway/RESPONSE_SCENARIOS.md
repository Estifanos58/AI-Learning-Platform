# API Gateway Response Scenarios (Client Contract)

This document defines the response behavior for all public gateway endpoints.

## 1) Standard Error Response (All Endpoints)

All failures return this JSON shape:

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

### Security rules applied
- Upstream/internal stack traces are never returned to clients.
- All 5xx responses use sanitized message text.
- `X-Correlation-ID` is included in error responses for traceability.
- `Cache-Control: no-store` is set on error responses.

### Common error status/code pairs
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

## 2) Auth Endpoints (`/api/auth/*`)

| Method | Path | Success | Typical error scenarios |
|---|---|---|---|
| POST | `/api/auth/signup` | `200` `AuthResponse` | `400` invalid email/password/role, `409` user already exists, `429` rate limit |
| POST | `/api/auth/login` | `200` `AuthResponse` | `400` invalid payload, `401` invalid credentials, `429` rate limit |
| POST | `/api/auth/verify-email` | `200` `ApiMessageResponse` | `400` missing/invalid token, `404` token/user not found |
| POST | `/api/auth/refresh` | `200` `AuthResponse` | `400` invalid payload, `401` invalid/expired refresh token |
| POST | `/api/auth/logout` | `200` `ApiMessageResponse` | `400` invalid payload, `401` invalid refresh token |

## 3) Profile Endpoints (`/api/profile/*`)

| Method | Path | Success | Typical error scenarios |
|---|---|---|---|
| GET | `/api/profile/me` | `200` `UserProfileResponse` | `401` missing/invalid bearer token, `404` profile not found |
| GET | `/api/profile/{userId}` | `200` `UserProfileResponse` | `401` unauthorized, `403` visibility restriction, `404` not found |
| PUT | `/api/profile/me` | `200` `UserProfileResponse` | `400` validation failure, `401` unauthorized |
| GET | `/api/profile/search` | `200` `SearchProfilesResponse` | `400` malformed query params, `401` unauthorized |
| PATCH | `/api/profile/visibility` | `200` `ApiMessageResponse` | `400` invalid visibility, `401` unauthorized |
| POST | `/api/profile/reputation` | `200` `ApiMessageResponse` | `401` unauthorized, `403` admin role required, `404` user not found |

## 4) File Endpoints (`/api/files/*`)

| Method | Path | Success | Typical error scenarios |
|---|---|---|---|
| POST | `/api/files` | `200` `FileResponse` | `400` invalid Base64/content type, `401` unauthorized, `404` folder not found |
| POST | `/api/files/folders` | `200` `FolderResponse` | `400` invalid name/parent, `401` unauthorized, `409` duplicate folder |
| PUT | `/api/files/folders/{folderId}` | `200` `FolderResponse` | `400` invalid name, `401` unauthorized, `404` folder not found |
| DELETE | `/api/files/folders/{folderId}` | `200` `ApiMessageResponse` | `401` unauthorized, `403` no permission, `404` folder not found |
| POST | `/api/files/folders/{folderId}/share` | `200` `ApiMessageResponse` | `400` invalid shared user, `401` unauthorized, `403` no permission, `404` folder/user not found |
| DELETE | `/api/files/folders/{folderId}/share/{userId}` | `200` `ApiMessageResponse` | `401` unauthorized, `403` no permission, `404` share not found |
| GET | `/api/files/folders` | `200` `ListFoldersResponse` | `401` unauthorized |
| GET | `/api/files/folders/shared` | `200` `ListFoldersResponse` | `401` unauthorized |
| GET | `/api/files/{fileId}` | `200` `FileResponse` | `401` unauthorized, `403` no permission, `404` file not found |
| DELETE | `/api/files/{fileId}` | `200` `ApiMessageResponse` | `401` unauthorized, `403` no permission, `404` file not found |
| POST | `/api/files/{fileId}/share` | `200` `ApiMessageResponse` | `400` invalid shared user, `401` unauthorized, `403` no permission, `404` file/user not found |
| POST | `/api/files/{fileId}/unshare` | `200` `ApiMessageResponse` | `401` unauthorized, `403` no permission, `404` share not found |
| PATCH | `/api/files/{fileId}/metadata` | `200` `FileResponse` | `400` invalid metadata, `401` unauthorized, `404` file not found |
| GET | `/api/files/my` | `200` `ListFilesResponse` | `400` invalid enum/query params, `401` unauthorized |
| GET | `/api/files/shared-with-me` | `200` `ListFilesResponse` | `401` unauthorized |
| GET | `/api/files/{fileId}/path` | `200` `String` (absolute path) | `401` unauthorized, `403` no permission, `404` file not found |

## 5) Chat Endpoints (`/api/chat/*`)

| Method | Path | Success | Typical error scenarios |
|---|---|---|---|
| POST | `/api/chat/messages` | `200` `SendChatMessageResponse` | `400` malformed payload/Base64 attachment, `401` unauthorized, `404` chatroom/user/file not found |
| GET | `/api/chat/chatrooms/{chatroomId}` | `200` `ChatroomDto` | `401` unauthorized, `403` not a member, `404` chatroom not found |
| GET | `/api/chat/chatrooms` | `200` `ListChatroomsResponse` | `401` unauthorized |
| GET | `/api/chat/chatrooms/{chatroomId}/messages` | `200` `ListChatMessagesResponse` | `401` unauthorized, `403` not a member, `404` chatroom not found |
| POST | `/api/chat/chatrooms/{chatroomId}/typing` | `200` `ApiMessageResponse` | `401` unauthorized, `403` not a member, `404` chatroom not found |

## 6) Client Handling Recommendations

- Use `status` and `code` as the primary machine-readable handling keys.
- Show `message` directly only for 4xx; for 5xx display a generic UX message with `correlationId`.
- Log `correlationId` client-side for support/debug workflows.
- Handle `429` with retry/backoff and user feedback.
