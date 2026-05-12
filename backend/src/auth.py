import jwt
import uuid
from datetime import datetime, timezone, timedelta
from functools import wraps
from flask import request, jsonify, current_app, g
from src.extensions import db
from src.models import User, TokenBlocklist


def generate_access_token(user_id):
    payload = {
        'sub': user_id,
        'type': 'access',
        'iat': datetime.now(timezone.utc),
        'exp': datetime.now(timezone.utc) + timedelta(minutes=15),
    }
    return jwt.encode(payload, current_app.config['SECRET_KEY'], algorithm='HS256')


def generate_refresh_token(user_id, device_id=None):
    jti = str(uuid.uuid4())
    payload = {
        'sub': user_id,
        'type': 'refresh',
        'jti': jti,
        'iat': datetime.now(timezone.utc),
        'exp': datetime.now(timezone.utc) + timedelta(days=7),
    }
    if device_id:
        payload['did'] = device_id
    token = jwt.encode(payload, current_app.config['SECRET_KEY'], algorithm='HS256')
    return token, jti


def generate_media_token(user_id):
    payload = {
        'sub': user_id,
        'type': 'media',
        'iat': datetime.now(timezone.utc),
        'exp': datetime.now(timezone.utc) + timedelta(minutes=5),
    }
    return jwt.encode(payload, current_app.config['SECRET_KEY'], algorithm='HS256')


def decode_token(token):
    try:
        return jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None


def media_or_login_required(f):
    """Décorateur pour le download : accepte les access tokens ET les media tokens (5 min, query param uniquement)."""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization', '')
        token = None

        if auth_header.startswith('Bearer '):
            token = auth_header.split(' ', 1)[1]

        query_token = request.args.get('token')
        if not token:
            token = query_token

        if not token:
            return jsonify({'error': 'Autorisation manquante'}), 401

        payload = decode_token(token)
        if not payload:
            return jsonify({'error': 'Token invalide ou expiré'}), 401

        token_type = payload.get('type')
        if token_type == 'access':
            pass
        elif token_type == 'media' and token == query_token:
            pass  # media token uniquement via query param
        else:
            return jsonify({'error': 'Type de token invalide'}), 401

        user = db.session.get(User, payload['sub'])
        if not user:
            return jsonify({'error': 'Utilisateur introuvable'}), 401

        g.current_user_id = user.id
        g.current_user = user
        return f(*args, **kwargs)
    return decorated


def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        # Check Authorization header first
        auth_header = request.headers.get('Authorization', '')
        token = None
        if auth_header.startswith('Bearer '):
            token = auth_header.split(' ', 1)[1]

        # Fallback: query param for inline media (img/video/iframe src)
        if not token:
            token = request.args.get('token')

        if not token:
            return jsonify({'error': 'Autorisation manquante'}), 401

        payload = decode_token(token)
        if not payload:
            return jsonify({'error': 'Token invalide ou expiré'}), 401

        if payload.get('type') != 'access':
            return jsonify({'error': 'Type de token invalide'}), 401

        user = db.session.get(User, payload['sub'])
        if not user:
            return jsonify({'error': 'Utilisateur introuvable'}), 401

        g.current_user_id = user.id
        g.current_user = user
        return f(*args, **kwargs)

    return decorated
