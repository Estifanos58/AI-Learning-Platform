from __future__ import annotations

from functools import lru_cache

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8', extra='ignore')

    service_name: str = 'notification-service'
    environment: str = Field(default='production', validation_alias=AliasChoices('APP_ENV', 'environment'))
    log_level: str = Field(default='INFO', validation_alias=AliasChoices('LOG_LEVEL', 'log_level'))

    kafka_bootstrap_servers: str = Field(
        default='localhost:9092',
        validation_alias=AliasChoices(
            'kafka_bootstrap_servers',
            'KAFKA_BOOTSTRAP_SERVERS',
            'SPRING_KAFKA_BOOTSTRAP_SERVERS',
        ),
    )
    kafka_group_id: str = Field(
        default='notification-service-v1',
        validation_alias=AliasChoices('kafka_group_id', 'KAFKA_GROUP_ID'),
    )
    kafka_topic_email_verification: str = Field(
        default='user.email.verification.v1',
        validation_alias=AliasChoices(
            'kafka_topic_email_verification',
            'KAFKA_TOPIC_EMAIL_VERIFICATION',
            'APP_KAFKA_TOPIC_USER_EMAIL_VERIFICATION',
        ),
    )
    kafka_topic_email_failed: str = Field(
        default='notification.email.failed.v1',
        validation_alias=AliasChoices('kafka_topic_email_failed', 'KAFKA_TOPIC_EMAIL_FAILED'),
    )
    kafka_auto_create_topics: bool = Field(
        default=False,
        validation_alias=AliasChoices('KAFKA_AUTO_CREATE_TOPICS', 'kafka_auto_create_topics'),
    )

    smtp_host: str = Field(default='smtp.gmail.com', validation_alias=AliasChoices('smtp_host', 'SMTP_HOST'))
    smtp_port: int = Field(default=587, validation_alias=AliasChoices('smtp_port', 'SMTP_PORT'))
    smtp_username: str = Field(default='', validation_alias=AliasChoices('smtp_username', 'SMTP_USERNAME'))
    smtp_password: str = Field(default='', validation_alias=AliasChoices('smtp_password', 'SMTP_PASSWORD'))
    smtp_from: str = Field(
        default='no-reply@ai-learning-platform.local',
        validation_alias=AliasChoices('smtp_from', 'SMTP_FROM'),
    )

    # Persistent deduplication configuration
    idempotency_backend: str = Field(
        default='redis',
        validation_alias=AliasChoices('IDEMPOTENCY_BACKEND', 'idempotency_backend'),
    )
    redis_url: str = Field(
        default='redis://localhost:6379/0',
        validation_alias=AliasChoices('REDIS_URL', 'redis_url'),
    )
    idempotency_sqlite_path: str = Field(
        default='/tmp/notification_idempotency.db',
        validation_alias=AliasChoices('IDEMPOTENCY_SQLITE_PATH', 'idempotency_sqlite_path'),
    )
    idempotency_ttl_seconds: int = Field(
        default=86400,
        validation_alias=AliasChoices('IDEMPOTENCY_TTL_SECONDS', 'idempotency_ttl_seconds'),
    )
    idempotency_processing_ttl_seconds: int = Field(
        default=300,
        validation_alias=AliasChoices('IDEMPOTENCY_PROCESSING_TTL_SECONDS', 'idempotency_processing_ttl_seconds'),
    )
    consumer_poll_timeout_seconds: float = Field(
        default=1.0,
        validation_alias=AliasChoices('CONSUMER_POLL_TIMEOUT_SECONDS', 'consumer_poll_timeout_seconds'),
    )

    def model_post_init(self, __context: object) -> None:
        backend = self.idempotency_backend.strip().lower()
        if backend not in {'redis', 'sqlite'}:
            raise ValueError("IDEMPOTENCY_BACKEND must be 'redis' or 'sqlite' (in-memory deduplication is not permitted)")
        if self.environment not in {'development', 'test'} and backend == 'redis' and not self.redis_url:
            raise ValueError('REDIS_URL must be configured for persistent deduplication')


@lru_cache
def get_settings() -> Settings:
    return Settings()
