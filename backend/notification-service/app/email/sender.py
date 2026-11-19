from __future__ import annotations

import html
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path

from app.config import Settings


class NonRetryableNotificationError(RuntimeError):
    """Raised when notification delivery fails permanently (e.g. missing credentials or auth failure)."""


class EmailSender:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        template_path = Path(__file__).parent / 'templates' / 'verify_email.html'
        self._verify_template = template_path.read_text(encoding='utf-8')

    def send_verification_email(self, to_email: str, username: str, verification_code: str) -> None:
        smtp_username = self._settings.smtp_username.strip()
        smtp_password = self._normalize_smtp_password(self._settings.smtp_password)

        if not smtp_username or not smtp_password:
            raise NonRetryableNotificationError(
                'SMTP credentials are missing. Set SMTP_USERNAME and SMTP_PASSWORD.'
            )

        from_address = self._settings.smtp_from.strip() or smtp_username
        if self._settings.smtp_host.strip().lower() == 'smtp.gmail.com':
            from_address = smtp_username

        safe_username_html = html.escape(username, quote=True)
        safe_code_html = html.escape(verification_code, quote=True)

        subject = 'Verify your AI Learning Platform email'
        html_body = (
            self._verify_template
            .replace('{{username}}', safe_username_html)
            .replace('{{verificationCode}}', safe_code_html)
        )

        msg = MIMEMultipart('alternative')
        msg['From'] = from_address
        msg['To'] = to_email
        msg['Subject'] = subject

        text_body = (
            f'Hello {username},\n\n'
            'Your AI Learning Platform verification code is:\n\n'
            f'{verification_code}\n\n'
            'This code expires in 10 minutes.\n'
        )

        msg.attach(MIMEText(text_body, 'plain', 'utf-8'))
        msg.attach(MIMEText(html_body, 'html', 'utf-8'))

        try:
            with smtplib.SMTP(self._settings.smtp_host.strip(), self._settings.smtp_port, timeout=15) as server:
                server.ehlo()
                server.starttls(context=ssl.create_default_context())
                server.ehlo()
                server.login(smtp_username, smtp_password)
                server.sendmail(from_address, [to_email], msg.as_string())
        except smtplib.SMTPAuthenticationError as exc:
            raise NonRetryableNotificationError('SMTP authentication failed') from exc

    def _normalize_smtp_password(self, raw_password: str) -> str:
        candidate = (raw_password or '').strip()
        if self._settings.smtp_host.strip().lower() == 'smtp.gmail.com':
            # Gmail app passwords are 16 letters; users often paste them as 4-word chunks.
            candidate = ''.join(candidate.split())
        return candidate
