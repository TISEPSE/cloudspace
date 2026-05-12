from flask import Blueprint, jsonify
from sqlalchemy import text
from src.extensions import db

health_bp = Blueprint('health', __name__)


@health_bp.route('/api/health', methods=['GET'])
def health():
    """Lightweight unauthenticated probe used by the mobile app and reverse proxies."""
    db_ok = True
    try:
        db.session.execute(text('SELECT 1'))
    except Exception:
        db_ok = False

    status = 'ok' if db_ok else 'degraded'
    return jsonify({
        'status': status,
        'service': 'cloudspace-api',
        'db': 'ok' if db_ok else 'error',
    }), 200 if db_ok else 503
