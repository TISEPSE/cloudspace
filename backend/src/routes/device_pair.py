"""Pairing ephemere d'un appareil mobile via QR code.

Flux :
1. Web (connecte) -> POST /create -> recoit un token + URL QR
2. Mobile scanne -> POST /consume -> recoit access/refresh tokens
3. Web peut lister/revoquer ses pairings dans Settings
"""
import secrets
from datetime import datetime, timezone, timedelta

from flask import Blueprint, request, jsonify, g

from src.auth import login_required, generate_access_token, generate_refresh_token
from src.extensions import db, limiter
from src.models import DevicePairing, User


device_pair_bp = Blueprint('device_pair', __name__)

PAIRING_TTL_MINUTES = 5


def _now():
    return datetime.now(timezone.utc)


def _utc_iso(dt):
    """Renvoie un ISO 8601 explicitement en UTC (suffixe Z) pour éviter
    que le navigateur interprète un datetime naïf comme heure locale."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat()


def _serialize(p, *, include_consumed_meta=False):
    out = {
        'id': p.id,
        'expires_at': _utc_iso(p.expires_at),
        'used_at': _utc_iso(p.used_at),
        'created_at': _utc_iso(p.created_at),
        'device_label': p.device_label,
    }
    if include_consumed_meta:
        out['consumed_ip'] = p.consumed_ip
        out['consumed_ua'] = p.consumed_ua
        out['device_id'] = p.device_id
    return out


@device_pair_bp.route('/api/auth/device-pair/create', methods=['POST'])
@login_required
@limiter.limit("10 per hour")
def create_pairing():
    """Genere un token ephemere pour un nouvel appareil. Auth requise."""
    user_id = g.current_user_id
    token = secrets.token_urlsafe(32)  # 256 bits aleatoires

    pairing = DevicePairing(
        user_id=user_id,
        token=token,
        expires_at=_now() + timedelta(minutes=PAIRING_TTL_MINUTES),
        created_ip=(request.headers.get('X-Forwarded-For') or request.remote_addr or '').split(',')[0].strip(),
    )
    db.session.add(pairing)
    db.session.commit()

    return jsonify({
        'pair_token': token,
        'expires_at': _utc_iso(pairing.expires_at),
        'ttl_seconds': PAIRING_TTL_MINUTES * 60,
        'id': pairing.id,
    }), 201


@device_pair_bp.route('/api/auth/device-pair/consume', methods=['POST'])
@limiter.limit("10 per 15 minutes")
def consume_pairing():
    """Echange un pair_token contre access + refresh tokens. Pas d'auth requise."""
    data = request.get_json(silent=True) or {}
    token = (data.get('token') or '').strip()
    device_id = (data.get('device_id') or '').strip() or None
    device_label = (data.get('device_label') or '').strip()[:120] or None

    if not token or len(token) < 32:
        return jsonify({'error': 'Token invalide'}), 400

    pairing = DevicePairing.query.filter_by(token=token).first()
    if not pairing:
        return jsonify({'error': 'Token introuvable ou deja consomme'}), 404

    # SQLAlchemy renvoie un datetime naive depuis Postgres si la colonne n'a pas
    # de timezone -> on force la comparaison en UTC.
    expires_at = pairing.expires_at
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if pairing.used_at is not None:
        return jsonify({'error': 'Token deja utilise'}), 409
    if expires_at and expires_at < _now():
        return jsonify({'error': 'Token expire'}), 410

    user = db.session.get(User, pairing.user_id)
    if not user:
        return jsonify({'error': 'Utilisateur introuvable'}), 404

    pairing.used_at = _now()
    pairing.consumed_ip = (request.headers.get('X-Forwarded-For') or request.remote_addr or '').split(',')[0].strip()
    pairing.consumed_ua = (request.headers.get('User-Agent') or '')[:500]
    pairing.device_id = device_id
    pairing.device_label = device_label
    db.session.commit()

    access = generate_access_token(user.id)
    refresh, _ = generate_refresh_token(user.id, device_id=device_id)

    return jsonify({
        'access_token': access,
        'refresh_token': refresh,
        'user': {
            'id': user.id,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'email': user.email,
            'avatar_url': user.avatar_url,
        },
    }), 200


@device_pair_bp.route('/api/auth/device-pair/list', methods=['GET'])
@login_required
def list_pairings():
    """Liste les pairings de l'utilisateur (actifs + consommes recents)."""
    user_id = g.current_user_id
    cutoff = _now() - timedelta(days=30)
    pairings = (DevicePairing.query
                .filter(DevicePairing.user_id == user_id)
                .filter((DevicePairing.used_at.is_(None)) | (DevicePairing.used_at >= cutoff))
                .order_by(DevicePairing.created_at.desc())
                .all())

    active = []
    consumed = []
    now = _now()
    for p in pairings:
        expires = p.expires_at
        if expires and expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        if p.used_at is None and expires and expires > now:
            active.append(_serialize(p))
        elif p.used_at is not None:
            consumed.append(_serialize(p, include_consumed_meta=True))

    return jsonify({'active': active, 'consumed': consumed}), 200


@device_pair_bp.route('/api/auth/device-pair/<pairing_id>', methods=['DELETE'])
@login_required
def revoke_pairing(pairing_id):
    """Revoque (supprime) un pairing : annule un QR non consomme,
    ou supprime un enregistrement d'appareil consomme."""
    user_id = g.current_user_id
    pairing = DevicePairing.query.filter_by(id=pairing_id, user_id=user_id).first()
    if not pairing:
        return jsonify({'error': 'Pairing introuvable'}), 404

    db.session.delete(pairing)
    db.session.commit()
    return jsonify({'ok': True}), 200
