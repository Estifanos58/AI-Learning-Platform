import logging

from fastapi import FastAPI

from app.config import get_settings
from app.email.sender import EmailSender
from app.handlers.verification_handler import VerificationHandler
from app.kafka.consumer import VerificationConsumer
from app.utils.idempotency import InMemoryIdempotencyStore

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(name)s %(message)s')

settings = get_settings()
email_sender = EmailSender(settings)
verification_handler = VerificationHandler(email_sender)
idempotency_store = InMemoryIdempotencyStore(ttl_seconds=settings.idempotency_ttl_seconds)

app = FastAPI(title='Notification Service', version='1.0.0')


@app.on_event('startup')
def startup_event() -> None:
    app.state.verification_consumer = None
    try:
        consumer = VerificationConsumer(settings, verification_handler, idempotency_store)
        consumer.start()
        app.state.verification_consumer = consumer
        logging.getLogger(__name__).info('Kafka consumer started successfully')
    except Exception as exc:
        logging.getLogger(__name__).exception(
            'Kafka consumer failed to start; notification service startup aborted: %s',
            exc,
        )
        raise RuntimeError('Failed to initialize Kafka verification consumer') from exc


@app.on_event('shutdown')
def shutdown_event() -> None:
    consumer = getattr(app.state, 'verification_consumer', None)
    if consumer is not None:
        consumer.stop()


@app.get('/health')
def health() -> dict[str, str]:
    return {'status': 'ok'}
