Objective

Create a production-ready User Profile Service responsible for:

Managing user profile data

Consuming UserRegistered events from Kafka

Automatically creating default profiles for new users

Exposing gRPC endpoints for profile operations

Supporting search and profile visibility rules

Maintaining strong service boundaries (no direct DB coupling with auth-service)

This service must follow event-driven architecture principles and integrate with:

auth-service (via Kafka events)

api-gateway (via gRPC)

Kafka (as message broker)

SQL database (PostgreSQL preferred)

1. Project Metadata

Project Name: user-profile-service
Build Tool: Maven
Language: Java 21
Framework: Spring Boot 3.x
Communication:

gRPC (Server)

Kafka (Consumer)

SQL (JPA/Hibernate)

2. Architectural Role

The User Profile Service:

Owns profile data

Does NOT authenticate users

Does NOT manage credentials

Reacts to domain events from Auth Service

Exposes profile operations via gRPC only

High-Level Flow

User signs up via API Gateway

Gateway → Auth Service (gRPC)

Auth Service:

Creates User

Publishes UserRegisteredEvent to Kafka

User Profile Service:

Consumes event

Creates default profile

Clients fetch/update profile via:
REST → API Gateway → gRPC → User Profile Service

3. Technology Stack & Dependencies
Core Dependencies

spring-boot-starter-data-jpa

spring-boot-starter-validation

spring-kafka

grpc-server-spring-boot-starter

protobuf-java

postgresql (or mysql)

lombok

mapstruct (for DTO mapping)

4. Database Design
Table: user_profiles
CREATE TABLE user_profiles (
    user_id UUID PRIMARY KEY,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    university_id VARCHAR(50),
    department VARCHAR(100),
    bio TEXT,
    avatar_url TEXT,
    profile_visibility VARCHAR(20) DEFAULT 'PUBLIC',
    reputation_score INTEGER DEFAULT 0,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);
Important:

DO NOT use foreign key to auth-service database.

Services must remain database-isolated.

Only store user_id as UUID.

5. Updated Domain Model

Enhance your current model:

@Entity
@Table(name = "user_profiles")
public class UserProfile {

    @Id
    private UUID userId;

    private String firstName;
    private String lastName;
    private String universityId;
    private String department;

    @Column(columnDefinition = "TEXT")
    private String bio;

    private String avatarUrl;

    @Enumerated(EnumType.STRING)
    private ProfileVisibility profileVisibility; // PUBLIC, UNIVERSITY_ONLY, PRIVATE

    private Integer reputationScore;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
Enum
public enum ProfileVisibility {
    PUBLIC,
    UNIVERSITY_ONLY,
    PRIVATE
}
6. Kafka Integration
Topic

user.registered.v1

Event Schema (JSON)

Auth Service must publish:

{
  "eventId": "uuid",
  "eventType": "USER_REGISTERED",
  "userId": "uuid",
  "email": "string",
  "universityId": "string",
  "timestamp": "2026-02-25T10:15:30"
}
Kafka Consumer Requirements

Group ID: user-profile-service

Manual acknowledgment

Idempotent processing

Retry mechanism

Dead Letter Topic: user.registered.dlt

Consumer Logic

When USER_REGISTERED event is received:

Check if profile exists (idempotency check)

If not exists:

Create profile with:

profileVisibility = PUBLIC

reputationScore = 0

firstName/lastName = null

bio = empty

Save to DB

Log correlationId if present

7. gRPC Definition (profile.proto)

This is the source of truth.

Service Name: UserProfileService

RPCs Required
GetMyProfile(GetMyProfileRequest) returns (UserProfileResponse)
GetProfileById(GetProfileRequest) returns (UserProfileResponse)
UpdateMyProfile(UpdateProfileRequest) returns (UserProfileResponse)
SearchProfiles(SearchProfilesRequest) returns (SearchProfilesResponse)
UpdateProfileVisibility(UpdateVisibilityRequest) returns (SimpleResponse)
IncrementReputation(IncrementReputationRequest) returns (SimpleResponse)
Security Model

JWT validated at API Gateway

Gateway forwards:

userId

roles

universityId
via gRPC metadata

Service must:

Extract userId from metadata

Never trust client-submitted userId for "my profile"

8. Business Rules
GetMyProfile

Must use authenticated userId from metadata

GetProfileById

Respect visibility rules:

PUBLIC → visible to everyone

UNIVERSITY_ONLY → visible only if same universityId

PRIVATE → only owner can view

UpdateMyProfile

User can update:

firstName

lastName

bio

department

avatarUrl

universityId

User cannot update:

reputationScore

userId

createdAt

9. Additional Recommended Features
A. Profile Completion Score

Add computed field:

completionScore (0–100)

Calculated based on:

firstName

lastName

bio

avatar

department

B. Soft Delete Support

Add:

deleted BOOLEAN DEFAULT FALSE
C. Audit Logging

Log:

profile updates

visibility changes

reputation changes

D. Profile Search Indexing

Allow search by:

universityId

department

name (LIKE search)

Use DB index:

CREATE INDEX idx_university ON user_profiles(university_id);
CREATE INDEX idx_department ON user_profiles(department);
10. Docker & Orchestration

Update docker-compose.yml:

Add:

user-profile-service:
  build: ./user-profile-service
  ports:
    - "9091:9091"
  depends_on:
    - kafka
    - postgres

Add Kafka:

kafka:
  image: bitnami/kafka:latest

Add PostgreSQL:

postgres:
  image: postgres:15-alpine

Expose only gRPC port (9091).

Do NOT expose DB externally.

11. application.yml
server:
  port: 9091

spring:
  datasource:
    url: jdbc:postgresql://postgres:5432/user_profile_db
    username: postgres
    password: postgres

  jpa:
    hibernate:
      ddl-auto: update

  kafka:
    bootstrap-servers: kafka:9092
    consumer:
      group-id: user-profile-service
      auto-offset-reset: earliest
12. Error Handling

Map exceptions to gRPC status:

ProfileNotFound → NOT_FOUND

UnauthorizedAccess → PERMISSION_DENIED

InvalidUpdate → INVALID_ARGUMENT

DuplicateProfile → ALREADY_EXISTS

13. Observability

Structured logging (JSON logs recommended)

Include Correlation ID from metadata

Log Kafka eventId

Add health endpoint via Spring Actuator

14. Definition of Done

✔ When a new user registers, a profile is automatically created
✔ Duplicate Kafka events do not create duplicate profiles
✔ Authenticated user can update only their profile
✔ Visibility rules are enforced correctly
✔ Search works by university and department
✔ gRPC communication works through API Gateway
✔ Service is containerized and works via docker-compose
✔ Dead-letter topic handles failed events
✔ Logs contain correlation IDs

15. Future Enhancements (Phase 2)

Profile picture upload via File Service

Reputation driven by AI learning achievements

Skill tags

Course enrollment linkage

Profile analytics

GraphQL support at Gateway