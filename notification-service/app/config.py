from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8', extra='ignore')

    service_name: str = 'notification-service'
    kafka_bootstrap_servers: str = 'localhost:9092'
    kafka_group_id: str = 'notification-service-v1'
    kafka_topic_email_verification: str = 'user.email.verification.v1'
    kafka_topic_email_failed: str = 'notification.email.failed.v1'

    smtp_host: str = 'smtp.gmail.com'
    smtp_port: int = 587
    smtp_username: str = ''
    smtp_password: str = ''
    smtp_from: str = 'no-reply@aiplatform.local'

    idempotency_ttl_seconds: int = 86400
    consumer_poll_timeout_seconds: float = 1.0


@lru_cache
def get_settings() -> Settings:
    return Settings()

