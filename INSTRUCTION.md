## Objective

Create a production-ready **Auth Service** using:

* Java 21
* Spring Boot 3.x
* PostgreSQL
* Spring Security (JWT with RS256)
* Docker
* Docker Compose
* Flyway for DB migrations

The project must follow **clean architecture principles** and enterprise-level structure.

This directory is currently empty.
You must generate the entire project from scratch.

---

# 1. Project Metadata

* Project Name: `auth-service`
* Build Tool: Maven
* Packaging: Jar
* Group: `com.aiplatform`
* Artifact: `auth-service`
* Java Version: 21

---

# 2. Required Dependencies

Include:

* spring-boot-starter-web
* spring-boot-starter-security
* spring-boot-starter-validation
* spring-boot-starter-data-jpa
* spring-boot-starter-actuator
* spring-boot-starter-mail
* postgresql
* flyway-core
* jjwt-api
* jjwt-impl
* jjwt-jackson
* lombok
* mapstruct
* springdoc-openapi-starter-webmvc-ui
* testcontainers (for postgres testing)
* spring-boot-starter-test

---

# 3. Architecture Requirements

Use layered architecture:

```
auth-service/
 ├── src/main/java/com/aiplatform/auth/
 │   ├── config/
 │   ├── controller/
 │   ├── service/
 │   ├── repository/
 │   ├── domain/
 │   ├── dto/
 │   ├── mapper/
 │   ├── security/
 │   ├── exception/
 │   └── util/
 │
 ├── src/main/resources/
 │   ├── application.yml
 │   ├── db/migration/
 │
 ├── Dockerfile
 ├── docker-compose.yml
 └── pom.xml
```

Follow clean separation:

* Controller → only HTTP layer
* Service → business logic
* Repository → data access
* Domain → JPA entities
* Security → JWT + filters
* DTO → request/response objects
* Mapper → MapStruct mapping
* Exception → global exception handler

---

# 4. Database Setup (PostgreSQL via Docker)

Create a `docker-compose.yml` with:

Services:

* postgres
* auth-service

Postgres configuration:

* Image: postgres:16
* Database: auth_db
* User: auth_user
* Password: auth_pass
* Expose port 5432
* Use named volume

Auth-service must depend on postgres.

---

# 5. Flyway Migration

Create migration file:

```
src/main/resources/db/migration/V1__init.sql
```

Include EXACT schema below.

---

## USERS TABLE

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(100) UNIQUE,

    password_hash TEXT NOT NULL,

    role VARCHAR(30) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',

    email_verified BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP NULL,

    CONSTRAINT chk_role
      CHECK (role IN ('STUDENT','INSTRUCTOR','ADMIN')),

    CONSTRAINT chk_status
      CHECK (status IN ('ACTIVE','SUSPENDED','LOCKED','DELETED'))
);
```

---

## USER PROFILES

```sql
CREATE TABLE user_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

    first_name VARCHAR(100),
    last_name VARCHAR(100),
    university_id VARCHAR(50),
    department VARCHAR(100),

    avatar_url TEXT,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## REFRESH TOKENS

```sql
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    token_hash TEXT NOT NULL,

    issued_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,

    revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMP NULL,

    replaced_by UUID NULL,

    ip_address VARCHAR(100),
    user_agent TEXT
);
```

Add index on:

```
CREATE INDEX idx_refresh_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_exp ON refresh_tokens(expires_at);
```

---

## EMAIL VERIFICATIONS

```sql
CREATE TABLE email_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,

    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## PASSWORD RESETS

```sql
CREATE TABLE password_resets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,

    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT NOW()
);
```

---

# 6. Security Requirements

Implement:

* JWT Access Token (RS256)
* Refresh Token rotation
* Stateless authentication
* Password hashing using BCrypt
* Global exception handler
* Validation using @Valid

---

# 7. JWT Requirements

Access token:

* 15 min expiration
* Claims:

  * sub (user id)
  * email
  * role
  * status
  * iat
  * exp
  * iss
  * aud

Refresh token:

* 7 days expiration
* Stored hashed
* Rotated on every refresh
* Revoked on logout

Store private/public keys in:

```
src/main/resources/keys/
```

---

# 8. Required Endpoints

Base path:

```
/api/auth
```

---

## 1️⃣ Signup

POST `/signup`

Body:

```
{
  "email": "",
  "username": "",
  "password": "",
  "role": "STUDENT"
}
```

Behavior:

* Validate unique email
* Hash password
* Create user
* Create email verification token
* Send verification email (mock if mail not configured)
* Return success message

---

## 2️⃣ Verify Email

POST `/verify-email`

Body:

```
{
  "token": ""
}
```

Behavior:

* Validate token
* Mark email_verified = true
* Mark token used

---

## 3️⃣ Login

POST `/login`

Body:

```
{
  "email": "",
  "password": ""
}
```

Behavior:

* Validate credentials
* Check email_verified
* Check status = ACTIVE
* Generate access + refresh token
* Store refresh token hashed
* Return tokens

---

## 4️⃣ Refresh Token

POST `/refresh`

Body:

```
{
  "refreshToken": ""
}
```

Behavior:

* Validate token
* Rotate token
* Revoke old
* Return new access + refresh

---

## 5️⃣ Logout

POST `/logout`

Body:

```
{
  "refreshToken": ""
}
```

Behavior:

* Revoke refresh token

---

## 6️⃣ Forgot Password

POST `/forgot-password`

* Generate reset token
* Store hashed token
* Send email (mock allowed)

---

## 7️⃣ Reset Password

POST `/reset-password`

* Validate reset token
* Hash new password
* Revoke all refresh tokens of user

---

# 9. Additional Requirements

* Use ResponseEntity consistently
* Use DTOs, never expose entities
* Add Swagger documentation
* Add health check endpoint
* Add Actuator
* Use @Transactional where required
* Implement proper error handling

---

# 10. Dockerfile

Create multi-stage Docker build:

* Build with Maven
* Run with slim JDK image

Expose port 8080.

---

# 11. application.yml Requirements

* Environment-based configuration
* Use environment variables for DB credentials
* Configure Flyway
* Configure JWT expiration properties

---

# 12. Professional Standards

* Use constructor injection only
* No field injection
* No business logic inside controller
* No circular dependencies
* Use logging (SLF4J)
* Add meaningful comments

---

# 13. Testing

* Add basic integration test for signup and login
* Use Testcontainers for PostgreSQL

---

# 14. Output Requirements

After generation, the service must:

* Run successfully with `docker-compose up`
* Apply Flyway migrations
* Expose Swagger UI
* Connect to PostgreSQL
* Allow full auth lifecycle

---

# 15. Do NOT

* Do not use H2
* Do not use in-memory DB
* Do not skip refresh rotation
* Do not store raw tokens
* Do not expose password_hash

---

# Final Goal

Produce a **production-ready Auth microservice** that:

* Is containerized
* Is secure
* Implements full JWT lifecycle
* Uses PostgreSQL properly
* Follows clean architecture
* Is ready to integrate with other microservices

---

If you want next, I can also generate a similar INSTRUCTION.md for:

* Chat Service
* File Service
* RAG Service (FastAPI)
* Or Kafka setup

Tell me which service we engineer next.
