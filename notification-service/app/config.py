from functools import lru_cache

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8', extra='ignore')

    service_name: str = 'notification-service'
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

    smtp_host: str = Field(default='smtp.gmail.com', validation_alias=AliasChoices('smtp_host', 'SMTP_HOST'))
    smtp_port: int = 587
    smtp_username: str = Field(default='', validation_alias=AliasChoices('smtp_username', 'SMTP_USERNAME'))
    smtp_password: str = Field(default='', validation_alias=AliasChoices('smtp_password', 'SMTP_PASSWORD'))
    smtp_from: str = Field(default='no-reply@aiplatform.local', validation_alias=AliasChoices('smtp_from', 'SMTP_FROM'))

    idempotency_ttl_seconds: int = 86400
    consumer_poll_timeout_seconds: float = 1.0


@lru_cache
def get_settings() -> Settings:
    return Settings()

