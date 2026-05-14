"""Server-Sent Events pour la synchronisation temps réel cross-device.

Les clients ouvrent une connexion sur GET /api/sync/events et reçoivent
des évènements JSON quand l'état de leur drive change (uploads, deletes,
renames, etc).
"""
import json
import queue
import time

import jwt
from flask import Blueprint, Response, current_app, request, jsonify

from src.sync import hub


sync_bp = Blueprint('sync', __name__)


@sync_bp.route('/api/sync/events', methods=['GET'])
def events():
    """Stream SSE des évènements de l'utilisateur courant.

    Authentification via query param `?token=<access_token>` car
    EventSource (côté navigateur) ne supporte pas les headers custom.
    """
    token = request.args.get('token', '')
    if not token:
        return jsonify({'error': 'Auth requise'}), 401
    try:
        payload = jwt.decode(
            token,
            current_app.config['SECRET_KEY'],
            algorithms=['HS256'],
        )
    except jwt.PyJWTError:
        return jsonify({'error': 'Token invalide'}), 401

    if payload.get('type') != 'access':
        return jsonify({'error': 'Type de token invalide'}), 401

    user_id = payload.get('sub')
    if not user_id:
        return jsonify({'error': 'Token invalide'}), 401

    def stream():
        q = hub.subscribe(user_id)
        try:
            yield 'event: ready\ndata: {"ok":true}\n\n'
            while True:
                try:
                    msg = q.get(timeout=20)
                    yield f'data: {msg}\n\n'
                except queue.Empty:
                    # Heartbeat pour garder la connexion ouverte (proxies / load balancers
                    # coupent souvent les connexions idle).
                    yield ': hb\n\n'
        except GeneratorExit:
            pass
        finally:
            hub.unsubscribe(user_id, q)

    response = Response(stream(), mimetype='text/event-stream')
    response.headers['X-Accel-Buffering'] = 'no'  # désactive le buffering nginx
    response.headers['Cache-Control'] = 'no-cache, no-transform'
    response.headers['Connection'] = 'keep-alive'
    return response
