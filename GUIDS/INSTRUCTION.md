Below is a **production-grade `INSTRUCTION.md`** you can give to an AI agent to implement the **Notification Service** and the required **changes to Auth Service and API Gateway** within your existing microservice architecture.

---

# INSTRUCTION.md

# Notification Service + Auth Service Refactor + API Gateway Enhancements

---

# 1. Objective

Introduce a **Notification Service** responsible for sending system emails.

The initial responsibility of the service is:

* Sending **email verification messages** for newly registered users.
* Sending **resend verification codes** when requested by the user.

This change requires:

1. **Creating a new Notification Service**
2. **Removing email sending logic from Auth Service**
3. **Publishing verification events from Auth Service to Kafka**
4. **Notification Service consuming those events**
5. **Sending email via Gmail SMTP**
6. **Adding resend verification endpoint**
7. **Adding endpoint-specific rate limiting**
8. **Adding throttling protections in API Gateway**

The system must remain **event-driven, scalable, and production-grade**.

---

# 2. Updated System Architecture

After implementation the system will contain **6 backend services**:

| Service                  | Technology       | Responsibility                           |
| ------------------------ | ---------------- | ---------------------------------------- |
| API Gateway              | Spring Boot      | REST entry point, rate limiting, routing |
| Auth Service             | Spring Boot      | Authentication, token issuance           |
| User Profile Service     | Spring Boot      | User profile management                  |
| File Service             | Spring Boot      | File storage and sharing                 |
| RAG Service              | Python (FastAPI) | AI retrieval system                      |
| **Notification Service** | Python (FastAPI) | Email notifications                      |

---

# 3. Architectural Principles

The implementation must preserve the following:

### Maintain

* Kafka event driven communication
* gRPC communication via API Gateway
* JWT validation at API Gateway
* Microservice isolation
* No cross-service database access
* No email logic inside Auth Service
* Strong rate limiting and throttling

### Communication Pattern

```
User → API Gateway → gRPC → Auth Service
Auth Service → Kafka → Notification Service
Notification Service → Gmail SMTP → User
```

---

# 4. Kafka Event Design

Create new event:

### Topic

```
user.email.verification.v1
```

---

### Event Payload

```json
{
  "eventId": "uuid",
  "userId": "uuid",
  "email": "user@email.com",
  "username": "username",
  "verificationCode": "123456",
  "createdAt": "2026-03-05T10:00:00Z"
}
```

---

### Event Rules

* Produced by **Auth Service**
* Consumed by **Notification Service**
* Use **JSON serialization**
* Include **correlationId** header
* Include **event versioning**

---

# 5. Auth Service Refactor

## 5.1 Remove Email Logic

Completely remove:

* SMTP configuration
* Email sender classes
* Email templates
* Verification email sending logic

Auth Service must **NOT send emails directly**.

---

# 5.2 Verification Code Generation

When user registers:

1. Generate verification code

```
6 digit numeric code
```

Example:

```
482913
```

---

### Storage Table

Create table:

```
email_verifications
```

```sql
CREATE TABLE email_verifications (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    verification_code VARCHAR(10) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL
);
```

Indexes:

```
CREATE INDEX idx_email_verification_user
ON email_verifications(user_id);
```

---

### Code Expiration

```
Expiration: 10 minutes
```

---

# 5.3 Registration Flow (New)

When user signs up:

```
1. Create user
2. Generate verification code
3. Store verification code
4. Publish Kafka event
5. Return tokens
```

---

### Publish Event

Topic:

```
user.email.verification.v1
```

Payload must include:

```
userId
email
username
verificationCode
```

---

# 5.4 Verify Email Flow

Request:

```
verifyEmail(token)
```

Validation:

1. Code exists
2. Code not expired
3. Code not used
4. Belongs to user

If valid:

```
mark used = true
set user.emailVerified = true
```

---

# 5.5 Resend Verification Code

Add new method.

### gRPC

```
ResendVerificationCode
```

Flow:

```
1. Identify user via JWT metadata
2. Check if already verified → reject
3. Generate new code
4. Invalidate previous codes
5. Store new code
6. Publish Kafka event
```

---

### Security Rule

Resend allowed only if:

```
emailVerified == false
```

---

# 6. Notification Service Implementation

The service will be built using:

```
FastAPI
Kafka Consumer
SMTP Email Sender
```

---

# 7. Notification Service Responsibilities

The service must:

* Subscribe to Kafka verification events
* Generate email message
* Send email via Gmail
* Handle retry logic
* Log failures
* Ensure idempotency

---

# 8. Notification Service Architecture

Components:

```
notification-service/
 ├── app
 │   ├── main.py
 │   ├── config.py
 │   ├── kafka
 │   │   ├── consumer.py
 │   │   └── topics.py
 │   ├── email
 │   │   ├── sender.py
 │   │   └── templates
 │   │       └── verify_email.html
 │   ├── handlers
 │   │   └── verification_handler.py
 │   └── utils
 │       └── retry.py
```

---

# 9. Gmail SMTP Configuration

Use environment variables:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=system@email.com
SMTP_PASSWORD=app_password
```

Security:

```
TLS enabled
```

---

# 10. Email Template

Verification email:

```
Subject: Verify your email

Hello {username},

Your verification code is:

{verificationCode}

This code expires in 10 minutes.
```

---

# 11. Kafka Consumer Behavior

Consumer must:

* Subscribe to:

```
user.email.verification.v1
```

* Deserialize JSON
* Call handler
* Send email

---

### Retry Policy

Retries:

```
3 retries
Exponential backoff
```

If retries exhausted:

```
log error
send to dead-letter-topic
```

Dead Letter Topic:

```
notification.email.failed.v1
```

---

# 12. Idempotency Requirement

Consumer must ensure:

```
same eventId processed only once
```

Solution:

* Use Redis or in-memory deduplication
* TTL: 24h

---

# 13. API Gateway Changes

Add route:

```
POST /auth/resend-verification
```

Gateway must:

```
forward request to auth-service
```

---

# 14. API Gateway Rate Limiting

Different endpoints require different limits.

### Normal Endpoints

Example:

```
100 requests / minute
```

---

### Auth Endpoints

Example:

```
login: 10/minute
signup: 5/minute
```

---

### Resend Verification Endpoint

Very strict:

```
3 requests / hour
```

---

# 15. Throttling Protection

Implement **IP based throttling**.

Rules:

If client exceeds limits:

```
429 Too Many Requests
```

---

### Additional Protection

Add:

```
burst protection
token bucket algorithm
```

---

# 16. gRPC Contract Updates

Add method:

```
rpc ResendVerificationCode(ResendVerificationRequest)
returns (SimpleResponse)
```

---

### Request

```
message ResendVerificationRequest {}
```

User is derived from:

```
gRPC metadata
```

---

# 17. Observability Requirements

Log fields:

```
correlationId
userId
eventId
email
requestIp
```

Metrics:

```
email.sent.count
email.failed.count
verification.code.generated
verification.resend.count
```

---

# 18. Security Requirements

Must implement:

### Input validation

Validate:

```
email
username
verification code
```

---

### Sensitive Data

Do NOT log:

```
verification codes
SMTP password
JWT
```

---

### SMTP Security

Use:

```
TLS
App Password
Environment variables
```

---

# 19. Deployment

Update `docker-compose`.

Add service:

```
notification-service
```

Dependencies:

```
kafka
zookeeper
```

---

# 20. Definition of Done

The implementation is complete when:

✔ Notification Service created
✔ Auth Service no longer sends emails
✔ Verification events published to Kafka
✔ Notification Service consumes events
✔ Emails sent through Gmail SMTP
✔ Resend verification endpoint added
✔ API Gateway route added
✔ Endpoint specific rate limiting implemented
✔ Throttling protections implemented
✔ Dead letter queue implemented
✔ Retry logic implemented
✔ Observability implemented
✔ Security best practices applied
✔ Full integration tested

---

# 21. Future Enhancements (Not Now)

Planned notification features:

* Password reset emails
* File share notifications
* In-app notifications
* WebSocket notifications
* SMS notifications
* Email template service
* Notification preference system

---

If you'd like, I can also generate a **much stronger “enterprise-grade” version of this instruction (≈3x better)** that includes:

* **exact Kafka configs**
* **Spring Boot rate limiter configs**
* **FastAPI Kafka consumer implementation structure**
* **Gmail OAuth2 instead of password**
* **circuit breakers**
* **retry topics**
* **saga/event patterns**

—which would make your platform **closer to production systems used by companies like Notion or Slack.**
