import os
import secrets
import smtplib
import requests as http_req
from datetime import datetime, timezone, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from flask import Blueprint, request, jsonify, g
from werkzeug.security import generate_password_hash, check_password_hash
from src.extensions import db, limiter
from src.models import User, UserSettings, TokenBlocklist, EmailVerificationToken
from src.auth import generate_access_token, generate_refresh_token, generate_media_token, decode_token, login_required

auth_bp = Blueprint('auth', __name__)

TURNSTILE_SECRET = os.environ.get('TURNSTILE_SECRET_KEY', '')

# Origines des wrappers natifs Capacitor — exemptées de Turnstile
# (Cloudflare ne peut pas vérifier ces origines, mais l'app passe par CORS strict)
_NATIVE_ORIGINS = frozenset((
    'capacitor://localhost',
    'http://localhost',
    'https://localhost',
))

def _verify_turnstile(token, remote_ip=''):
    if not TURNSTILE_SECRET:
        return True
    # Bypass pour les apps natives (Capacitor) : le Origin est validé par CORS
    origin = request.headers.get('Origin', '')
    if origin in _NATIVE_ORIGINS:
        return True
    if not token:
        return False
    try:
        resp = http_req.post(
            'https://challenges.cloudflare.com/turnstile/v0/siteverify',
            data={'secret': TURNSTILE_SECRET, 'response': token, 'remoteip': remote_ip},
            timeout=5,
        )
        return resp.json().get('success', False)
    except Exception:
        return False  # fail closed — Cloudflare inaccessible, on refuse

SMTP_HOST = os.environ.get('SMTP_HOST', '')
SMTP_PORT = int(os.environ.get('SMTP_PORT', '587'))
SMTP_USER = os.environ.get('SMTP_USER', '')
SMTP_PASS = os.environ.get('SMTP_PASS', '')
SMTP_FROM = os.environ.get('SMTP_FROM', SMTP_USER)
APP_URL = os.environ.get('APP_URL', 'http://localhost:8080')


def _send_verification_email(user_email: str, token: str) -> bool:
    """Send a verification email. Returns True on success, False on failure."""
    verify_url = f"{APP_URL}/verify-email?token={token}"

    msg = MIMEMultipart('alternative')
    msg['Subject'] = 'Vérifiez votre adresse e-mail — CloudSpace'
    msg['From'] = SMTP_FROM
    msg['To'] = user_email

    text = f"Bienvenue sur CloudSpace !\n\nCliquez sur ce lien pour vérifier votre e-mail :\n{verify_url}\n\nCe lien expire dans 24 heures."
    html = f"""
    <p>Bienvenue sur <strong>CloudSpace</strong> !</p>
    <p><a href="{verify_url}">Vérifier mon adresse e-mail</a></p>
    <p>Ce lien expire dans 24 heures.</p>
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


@auth_bp.route('/api/auth/register', methods=['POST'])
@limiter.limit("5 per minute")
def register():
    data = request.get_json()
    first_name = data.get('first_name', '').strip()
    last_name = data.get('last_name', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not _verify_turnstile(data.get('cf_turnstile_response', ''), request.remote_addr):
        return jsonify({'error': 'Vérification anti-bot échouée. Veuillez réessayer.'}), 400

    if not all([first_name, last_name, email, password]):
        return jsonify({'error': 'Tous les champs sont requis'}), 400

    if len(password) < 8:
        return jsonify({'error': 'Le mot de passe doit contenir au moins 8 caractères'}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Adresse e-mail déjà enregistrée'}), 409

    smtp_enabled = bool(SMTP_HOST)

    user = User(
        first_name=first_name,
        last_name=last_name,
        email=email,
        password_hash=generate_password_hash(password),
        is_verified=not smtp_enabled,  # auto-verify when no SMTP configured
    )
    db.session.add(user)
    db.session.flush()

    settings = UserSettings(user_id=user.id, theme='dark')
    db.session.add(settings)

    verification_token = None
    if smtp_enabled:
        raw_token = secrets.token_urlsafe(48)
        ev = EmailVerificationToken(
            user_id=user.id,
            token=raw_token,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
        )
        db.session.add(ev)
        db.session.commit()
        _send_verification_email(email, raw_token)
        verification_token = raw_token  # returned for self-hosted debug / no-SMTP fallback

    db.session.commit()

    if smtp_enabled:
        return jsonify({
            'message': 'Compte créé. Veuillez vérifier votre e-mail pour activer votre compte.',
            'email_verification_required': True,
        }), 201

    access_token = generate_access_token(user.id)
    refresh_token, _ = generate_refresh_token(user.id)

    return jsonify({
        'access_token': access_token,
        'refresh_token': refresh_token,
        'user': {
            'id': user.id,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'email': user.email,
            'role': user.role,
        },
    }), 201


@auth_bp.route('/api/auth/verify-email', methods=['GET'])
def verify_email():
    token = request.args.get('token', '').strip()
    if not token:
        return jsonify({'error': 'Token requis'}), 400

    ev = EmailVerificationToken.query.filter_by(token=token, used=False).first()
    if not ev:
        return jsonify({'error': 'Token invalide ou déjà utilisé'}), 400

    now = datetime.now(timezone.utc)
    expires = ev.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if now > expires:
        return jsonify({'error': 'Token expiré'}), 400

    ev.used = True
    user = db.session.get(User, ev.user_id)
    user.is_verified = True
    db.session.commit()

    access_token = generate_access_token(user.id)
    refresh_token, _ = generate_refresh_token(user.id)

    return jsonify({
        'message': 'Adresse e-mail vérifiée avec succès.',
        'access_token': access_token,
        'refresh_token': refresh_token,
        'user': {
            'id': user.id,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'email': user.email,
            'role': user.role,
        },
    })


@auth_bp.route('/api/auth/resend-verification', methods=['POST'])
@limiter.limit("3 per minute")
def resend_verification():
    if not SMTP_HOST:
        return jsonify({'error': 'La vérification par e-mail n\'est pas activée sur ce serveur'}), 400

    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    if not email:
        return jsonify({'error': 'L\'adresse e-mail est requise'}), 400

    user = User.query.filter_by(email=email).first()
    # Always return 200 to avoid email enumeration
    if not user or user.is_verified:
        return jsonify({'message': 'Si votre compte existe et n\'est pas vérifié, un nouvel e-mail a été envoyé.'}), 200

    raw_token = secrets.token_urlsafe(48)
    ev = EmailVerificationToken(
        user_id=user.id,
        token=raw_token,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
    )
    db.session.add(ev)
    db.session.commit()
    _send_verification_email(email, raw_token)

    return jsonify({'message': 'Si votre compte existe et n\'est pas vérifié, un nouvel e-mail a été envoyé.'}), 200


@auth_bp.route('/api/auth/login', methods=['POST'])
@limiter.limit("10 per minute; 50 per hour")
def login():
    data = request.get_json()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not _verify_turnstile(data.get('cf_turnstile_response', ''), request.remote_addr):
        return jsonify({'error': 'Vérification anti-bot échouée. Veuillez réessayer.'}), 400

    if not email or not password:
        return jsonify({'error': 'L\'email et le mot de passe sont requis'}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({'error': 'Email ou mot de passe incorrect'}), 401

    if not user.is_verified:
        return jsonify({
            'error': 'Veuillez vérifier votre adresse e-mail avant de vous connecter.',
            'email_verification_required': True,
        }), 403

    device_id = data.get('device_id', '')
    access_token = generate_access_token(user.id)
    refresh_token, _ = generate_refresh_token(user.id, device_id=device_id)

    return jsonify({
        'access_token': access_token,
        'refresh_token': refresh_token,
        'user': {
            'id': user.id,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'email': user.email,
            'role': user.role,
            'avatar_url': user.avatar_url,
        },
    })


@auth_bp.route('/api/auth/refresh', methods=['POST'])
def refresh():
    data = request.get_json()
    refresh_token = data.get('refresh_token', '')
    device_id = data.get('device_id', '')

    if not refresh_token:
        return jsonify({'error': 'Refresh token requis'}), 400

    payload = decode_token(refresh_token)
    if not payload or payload.get('type') != 'refresh':
        return jsonify({'error': 'Refresh token invalide ou expiré'}), 401

    jti = payload.get('jti')
    if TokenBlocklist.query.filter_by(jti=jti).first():
        return jsonify({'error': 'Token révoqué'}), 401

    # Validate device binding
    token_device_id = payload.get('did', '')
    if token_device_id and device_id and token_device_id != device_id:
        return jsonify({'error': 'Session invalide pour cet appareil'}), 401

    user = db.session.get(User, payload['sub'])
    if not user:
        return jsonify({'error': 'Utilisateur introuvable'}), 401

    # Rotate: invalider l'ancien token
    db.session.add(TokenBlocklist(jti=jti))
    db.session.commit()

    new_access_token = generate_access_token(user.id)
    new_refresh_token, _ = generate_refresh_token(user.id, device_id=token_device_id or device_id)

    return jsonify({
        'access_token': new_access_token,
        'refresh_token': new_refresh_token,
    })


@auth_bp.route('/api/auth/logout', methods=['POST'])
def logout():
    data = request.get_json() or {}
    refresh_token = data.get('refresh_token', '')

    if refresh_token:
        payload = decode_token(refresh_token)
        if payload and payload.get('jti'):
            blocked = TokenBlocklist(jti=payload['jti'])
            db.session.add(blocked)
            db.session.commit()

    return jsonify({'message': 'Déconnexion réussie'})


@auth_bp.route('/api/auth/media-token', methods=['GET'])
@login_required
def get_media_token():
    token = generate_media_token(g.current_user_id)
    return jsonify({'media_token': token, 'expires_in': 300})
