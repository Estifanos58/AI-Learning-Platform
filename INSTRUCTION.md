1. Objective

Refactor the existing File Service to introduce a hierarchical folder system.

The new requirements are:

A user MUST create a folder before uploading files.

Every file MUST belong to exactly one folder.

Introduce:

Create Folder

Update Folder

Delete Folder (soft delete)

Share Folder

Unshare Folder

List Folders

Refactor file upload logic to require folderId

Modify database schema accordingly

Update gRPC contracts

Update API Gateway endpoints

Preserve all previous file features

Maintain Kafka event publication

The service must remain production-grade.

2. High-Level Architectural Constraints

Do NOT break:

gRPC communication model

Kafka event-driven architecture

Local filesystem storage

Soft delete logic

Ownership validation

Sharing model consistency

RAG service direct volume access

PostgreSQL metadata storage

JWT is validated at API Gateway.
User identity is received via gRPC metadata.

3. New Domain Model – Folder
3.1 Folder Table

Create a new table:

CREATE TABLE folders (
    id UUID PRIMARY KEY,
    owner_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    parent_id UUID NULL,
    deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

Indexes:

CREATE INDEX idx_folders_owner ON folders(owner_id);
CREATE INDEX idx_folders_parent ON folders(parent_id);

Notes:

parent_id allows future nested folders.

For now, allow only single-level hierarchy (validation enforced in service).

No foreign key to users table.

Soft delete only.

3.2 Folder Shares Table
CREATE TABLE folder_shares (
    id UUID PRIMARY KEY,
    folder_id UUID NOT NULL,
    shared_with_user_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL,
    UNIQUE(folder_id, shared_with_user_id)
);

Indexes:

CREATE INDEX idx_folder_shared_user ON folder_shares(shared_with_user_id);

Folder sharing automatically grants access to all files in that folder.

4. File Schema Changes (Critical)

Modify files table:

Add:

ALTER TABLE files
ADD COLUMN folder_id UUID NOT NULL;

Add index:

CREATE INDEX idx_files_folder ON files(folder_id);

Important:

Every file MUST reference a folder.

Remove logic that stores files directly under /profile-images/{userId}

Instead:

/data/{ownerId}/{folderId}/{fileId}.{ext}

Profile image logic still exists, but file must belong to a folder.

5. Updated Domain Models
FolderEntity
@Entity
@Table(name = "folders")
public class FolderEntity {

    @Id
    private UUID id;

    private UUID ownerId;

    private String name;

    private UUID parentId;

    private Boolean deleted;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
FileEntity Modification

Add:

@Column(name = "folder_id", nullable = false)
private UUID folderId;
6. Storage Structure Refactor

OLD:

/data/profile-images/{userId}
/data/user-files/{userId}

NEW:

/data/{ownerId}/{folderId}/{storedFileName}

Rules:

Folder must exist before physical write

Folder physical directory auto-created if missing

If folder is deleted → files inside become inaccessible

7. New gRPC Definitions

Update file.proto

Add RPCs:

CreateFolder(CreateFolderRequest) returns (FolderResponse)
UpdateFolder(UpdateFolderRequest) returns (FolderResponse)
DeleteFolder(DeleteFolderRequest) returns (SimpleResponse)
ShareFolder(ShareFolderRequest) returns (SimpleResponse)
UnshareFolder(UnshareFolderRequest) returns (SimpleResponse)
ListMyFolders(ListMyFoldersRequest) returns (ListFoldersResponse)
ListSharedFolders(ListSharedFoldersRequest) returns (ListFoldersResponse)

Modify:

UploadFileRequest

Add:

string folderId = X;

Make it required.

8. Business Logic Rules
CreateFolder

Extract ownerId from metadata

Name required

Prevent duplicate folder names per owner at same hierarchy level

Generate UUID

Save to DB

Publish event (optional)

UpdateFolder

Only owner

Cannot update deleted folder

Cannot rename to existing sibling name

DeleteFolder

Only owner

Soft delete

All files inside folder:

Soft delete automatically

Publish:

folder.deleted.v1

file.deleted.v1 for each file (optional batch event)

ShareFolder

Only owner

Insert into folder_shares

All files inside implicitly accessible

UnshareFolder

Remove entry from folder_shares

Files inside become inaccessible unless individually shared

9. Updated UploadFile Logic

Before uploading:

Validate folderId exists

Validate folder not deleted

Validate:

Owner OR

Folder shared with user

Then:

Store physically in:

/data/{ownerId}/{folderId}/

Save metadata including folderId

Profile image logic:

Still ensure only 1 active PROFILE_IMAGE per user

Must belong to a folder

Soft delete previous image

10. Authorization Matrix
Operation	Owner	Folder Shared User
Upload	✔	✔ (if allowed)
Delete file	✔	✖
Share file	✔	✖
Read metadata	✔	✔
Delete folder	✔	✖
Share folder	✔	✖
11. Kafka Topics

Add:

folder.created.v1

folder.deleted.v1

folder.shared.v1

Existing:

file.uploaded.v1

file.deleted.v1

Example folder event:

{
  "eventId": "uuid",
  "folderId": "uuid",
  "ownerId": "uuid",
  "timestamp": "2026-03-01T10:00:00"
}
12. API Gateway Updates

Expose REST endpoints mapping to gRPC:

POST   /folders
PUT    /folders/{id}
DELETE /folders/{id}
POST   /folders/{id}/share
DELETE /folders/{id}/share/{userId}
GET    /folders
GET    /folders/shared

Modify:

POST /files

Must include:

folderId

Gateway continues forwarding:

userId

roles

universityId

correlationId

13. Required Refactoring Steps (Sequential Execution Plan)

Create FolderEntity + Repository

Create FolderShareEntity + Repository

Update FileEntity to include folderId

Write DB migration

Refactor file upload service

Refactor storage path logic

Add folder service layer

Implement gRPC methods

Update protobuf

Update API Gateway mappings

Add integration tests

Validate backward compatibility migration

Update docker-compose if necessary

Run full regression test

14. Observability Requirements

Log:

folderId

ownerId

fileId

correlationId

Add validation error logs.

Add metrics:

folder.create.count

file.upload.count

folder.share.count

15. Definition of Done

✔ Folder CRUD implemented
✔ Folder sharing implemented
✔ Files require folderId
✔ Storage path refactored
✔ Kafka events emitted
✔ gRPC updated
✔ API Gateway updated
✔ Soft delete enforced
✔ Ownership validation correct
✔ No cross-service DB coupling
✔ RAG still reads file path via volume
✔ All integration tests pass

16. Important Constraints

Do NOT introduce cross-service foreign keys

Do NOT break RAG direct file access

Do NOT expose DB externally

Do NOT store raw file content in PostgreSQL

Maintain clean separation of concerns

Maintain production-readiness

17. Future Enhancements (Not Now)

Nested folders (true tree support)

Folder-level permission roles

Folder-level visibility (public/private)

Folder quotas

Bulk file move between folders

Versioned folders

Migration to S3/MinIO

Final Architecture After Refactor

File Service becomes:

Owner of file metadata

Owner of folder metadata

Owner of physical file storage

Folder-based hierarchical storage system

Event-driven file lifecycle publisher

Integrated with:

Auth Service

User Profile Service

RAG Service

API Gateway