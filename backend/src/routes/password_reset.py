import os
import secrets
import smtplib
from datetime import datetime, timezone, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash
from src.extensions import db, limiter
from src.models import User, PasswordResetToken

password_reset_bp = Blueprint('password_reset', __name__)

SMTP_HOST = os.environ.get('SMTP_HOST', '')
SMTP_PORT = int(os.environ.get('SMTP_PORT', '587'))
SMTP_USER = os.environ.get('SMTP_USER', '')
SMTP_PASS = os.environ.get('SMTP_PASS', '')
SMTP_FROM = os.environ.get('SMTP_FROM', SMTP_USER)
APP_URL = os.environ.get('APP_URL', 'http://localhost:8080')


def _send_reset_email(user_email: str, token: str) -> bool:
    reset_url = f"{APP_URL}/reset-password?token={token}"

    msg = MIMEMultipart('alternative')
    msg['Subject'] = 'Réinitialisation de votre mot de passe — CloudSpace'
    msg['From'] = SMTP_FROM
    msg['To'] = user_email

    text = f"Vous avez demandé la réinitialisation de votre mot de passe.\n\nCliquez sur ce lien :\n{reset_url}\n\nCe lien expire dans 1 heure. Si vous n'avez pas fait cette demande, ignorez cet email."
    html = f"""
    <p>Vous avez demandé la réinitialisation de votre mot de passe <strong>CloudSpace</strong>.</p>
    <p><a href="{reset_url}">Réinitialiser mon mot de passe</a></p>
    <p>Ce lien expire dans 1 heure. Si vous n'avez pas fait cette demande, ignorez cet email.</p>
    """
    msg.attach(MIMEText(text, 'plain'))
    msg.attach(MIMEText(html, 'html'))

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as smtp:
            smtp.starttls()
            smtp.login(SMTP_USER, SMTP_PASS)
            smtp.sendmail(SMTP_FROM, user_email, msg.as_string())
        return True
    except Exception:
        return False


@password_reset_bp.route('/api/auth/forgot-password', methods=['POST'])
@limiter.limit("3 per minute")
def forgot_password():
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()

    if not email:
        return jsonify({'error': 'L\'adresse e-mail est requise'}), 400

    # Always return 200 to avoid email enumeration
    generic_response = jsonify({'message': 'Si un compte avec cet e-mail existe, un lien de réinitialisation a été envoyé.'})

    user = User.query.filter_by(email=email).first()
    if not user:
        return generic_response, 200

    if not SMTP_HOST:
        # No SMTP configured: return token directly (self-hosted convenience)
        raw_token = secrets.token_urlsafe(48)
        pr = PasswordResetToken(
            user_id=user.id,
            token=raw_token,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        )
        db.session.add(pr)
        db.session.commit()
        return jsonify({
            'message': 'SMTP non configuré. Utilisez le token ci-dessous pour réinitialiser votre mot de passe.',
            'reset_token': raw_token,
        }), 200

    raw_token = secrets.token_urlsafe(48)
    pr = PasswordResetToken(
        user_id=user.id,
        token=raw_token,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
    )
    db.session.add(pr)
    db.session.commit()
    _send_reset_email(email, raw_token)

    return generic_response, 200


@password_reset_bp.route('/api/auth/reset-password', methods=['POST'])
@limiter.limit("5 per minute")
def reset_password():
    data = request.get_json() or {}
    token = data.get('token', '').strip()
    new_password = data.get('new_password', '')

    if not token or not new_password:
        return jsonify({'error': 'Le token et le nouveau mot de passe sont requis'}), 400

    if len(new_password) < 8:
        return jsonify({'error': 'Le mot de passe doit contenir au moins 8 caractères'}), 400

    pr = PasswordResetToken.query.filter_by(token=token, used=False).first()
    if not pr:
        return jsonify({'error': 'Token invalide ou déjà utilisé'}), 400

    now = datetime.now(timezone.utc)
    expires = pr.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if now > expires:
        return jsonify({'error': 'Token expiré'}), 400

    pr.used = True
    user = db.session.get(User, pr.user_id)
    user.password_hash = generate_password_hash(new_password)
    db.session.commit()

    return jsonify({'message': 'Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter.'})
