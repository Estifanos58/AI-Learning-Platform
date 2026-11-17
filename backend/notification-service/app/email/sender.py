import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path

from app.config import Settings


class EmailSender:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        template_path = Path(__file__).parent / 'templates' / 'verify_email.html'
        self._verify_template = template_path.read_text(encoding='utf-8')

    def send_verification_email(self, to_email: str, username: str, verification_code: str) -> None:
        smtp_username = self._settings.smtp_username.strip()
        smtp_password = self._normalize_smtp_password(self._settings.smtp_password)

        if not smtp_username or not smtp_password:
            raise RuntimeError('SMTP credentials are missing. Set smtp_username and smtp_password.')

        from_address = self._settings.smtp_from.strip() or smtp_username
        # Gmail often rejects messages that do not use the authenticated account as sender.
        if self._settings.smtp_host.strip().lower() == 'smtp.gmail.com':
            from_address = smtp_username

        subject = 'Verify your email'
        html_body = (
            self._verify_template
            .replace('{{username}}', username)
            .replace('{{verificationCode}}', verification_code)
        )

        msg = MIMEMultipart('alternative')
        msg['From'] = from_address
        msg['To'] = to_email
        msg['Subject'] = subject

        text_body = (
            f'Hello {username},\n\n'
            'Your verification code is:\n\n'
            f'{verification_code}\n\n'
            'This code expires in 10 minutes.\n'
        )

        msg.attach(MIMEText(text_body, 'plain'))
        msg.attach(MIMEText(html_body, 'html'))

        with smtplib.SMTP(self._settings.smtp_host.strip(), self._settings.smtp_port, timeout=15) as server:
            server.ehlo()
            server.starttls(context=ssl.create_default_context())
            server.ehlo()
            server.login(smtp_username, smtp_password)
            server.sendmail(from_address, [to_email], msg.as_string())

    def _normalize_smtp_password(self, raw_password: str) -> str:
        # Allow accidental inline comments in env values (common in docker env_file usage).
        candidate = raw_password.split('#', 1)[0].strip()

        if self._settings.smtp_host.strip().lower() == 'smtp.gmail.com':
            # Gmail app passwords are 16 letters; users often paste them as 4-word chunks.
            candidate = ''.join(candidate.split())

        return candidate
