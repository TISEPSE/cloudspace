import os
import uuid
import magic
import logging
from flask import Blueprint, request, jsonify, current_app, g
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from sqlalchemy import text
from src.extensions import db
from src.models import User, File, ActivityLog, SharedFile, UserSettings, EmailVerificationToken
from src.auth import login_required

logger = logging.getLogger(__name__)

profile_bp = Blueprint('profile', __name__)

ALLOWED_AVATAR_TYPES = {'image/jpeg', 'image/png', 'image/gif', 'image/webp'}
MAX_AVATAR_SIZE = 5 * 1024 * 1024  # 5 MB


@profile_bp.route('/api/user/profile', methods=['GET'])
@login_required
def get_profile():
    user = db.session.get(User, g.current_user_id)
    if not user:
        return jsonify({'error': 'Utilisateur introuvable'}), 404

    return jsonify({
        'id': user.id,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'email': user.email,
        'bio': user.bio or '',
        'avatar_url': user.avatar_url,
        'role': user.role,
        'is_online': user.is_online,
        'storage_used': user.storage_used,
        'storage_limit': user.storage_limit,
        'created_at': user.created_at.isoformat() if user.created_at else None,
    })


@profile_bp.route('/api/user/profile', methods=['PUT'])
@login_required
def update_profile():
    user = db.session.get(User, g.current_user_id)
    if not user:
        return jsonify({'error': 'Utilisateur introuvable'}), 404

    data = request.get_json() or {}

    if 'first_name' in data:
        first_name = data['first_name'].strip()
        if not first_name:
            return jsonify({'error': 'Le prénom ne peut pas être vide'}), 400
        user.first_name = first_name

    if 'last_name' in data:
        last_name = data['last_name'].strip()
        if not last_name:
            return jsonify({'error': 'Le nom de famille ne peut pas être vide'}), 400
        user.last_name = last_name

    if 'bio' in data:
        user.bio = data['bio'].strip()

    db.session.commit()

    log = ActivityLog(
        user_id=user.id,
        action='settings_updated',
        details={'updated_fields': list(data.keys())},
    )
    db.session.add(log)
    db.session.commit()

    return jsonify({
        'id': user.id,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'email': user.email,
        'bio': user.bio or '',
        'avatar_url': user.avatar_url,
        'role': user.role,
    })


@profile_bp.route('/api/user/profile/avatar', methods=['POST'])
@login_required
def upload_avatar():
    user = db.session.get(User, g.current_user_id)
    if not user:
        return jsonify({'error': 'Utilisateur introuvable'}), 404

    if 'avatar' not in request.files:
        return jsonify({'error': 'Aucun fichier fourni'}), 400

    file = request.files['avatar']
    if not file.filename:
        return jsonify({'error': 'Aucun fichier sélectionné'}), 400

    data = file.read()
    if len(data) > MAX_AVATAR_SIZE:
        return jsonify({'error': 'Fichier trop volumineux (max 5 Mo)'}), 413

    mime = magic.from_buffer(data, mime=True)
    if mime not in ALLOWED_AVATAR_TYPES:
        return jsonify({'error': 'Type de fichier invalide. Seuls JPEG, PNG, GIF et WebP sont autorisés'}), 415

    upload_folder = current_app.config.get('UPLOAD_FOLDER', '/app/uploads')
    avatars_dir = os.path.join(upload_folder, 'avatars')
    os.makedirs(avatars_dir, exist_ok=True)

    # Delete old avatar file if it was locally stored
    if user.avatar_url and user.avatar_url.startswith('/api/user/avatar/'):
        old_filename = user.avatar_url.split('/')[-1]
        old_path = os.path.join(avatars_dir, old_filename)
        if os.path.exists(old_path):
            try:
                os.remove(old_path)
            except OSError:
                pass

    ext = mime.split('/')[-1].replace('jpeg', 'jpg')
    filename = f"{uuid.uuid4()}.{ext}"
    save_path = os.path.join(avatars_dir, filename)

    with open(save_path, 'wb') as f:
        f.write(data)

    user.avatar_url = f"/api/user/avatar/{filename}"
    db.session.commit()

    log = ActivityLog(user_id=user.id, action='avatar_changed', details={})
    db.session.add(log)
    db.session.commit()

    return jsonify({'avatar_url': user.avatar_url})


@profile_bp.route('/api/user/avatar/<filename>', methods=['GET'])
def serve_avatar(filename):
    """Serve avatar images (public endpoint — no auth required)."""
    from flask import send_from_directory
    upload_folder = current_app.config.get('UPLOAD_FOLDER', '/app/uploads')
    avatars_dir = os.path.join(upload_folder, 'avatars')
    return send_from_directory(avatars_dir, filename)


@profile_bp.route('/api/user/password/change', methods=['POST'])
@login_required
def change_password():
    user = db.session.get(User, g.current_user_id)
    if not user:
        return jsonify({'error': 'Utilisateur introuvable'}), 404

    data = request.get_json() or {}
    current_password = data.get('current_password', '')
    new_password = data.get('new_password', '')

    if not current_password or not new_password:
        return jsonify({'error': 'Le mot de passe actuel et le nouveau mot de passe sont requis'}), 400

    if not check_password_hash(user.password_hash, current_password):
        return jsonify({'error': 'Mot de passe actuel incorrect'}), 401

    if len(new_password) < 8:
        return jsonify({'error': 'Le nouveau mot de passe doit contenir au moins 8 caractères'}), 400

    user.password_hash = generate_password_hash(new_password)
    db.session.commit()

    log = ActivityLog(user_id=user.id, action='password_changed', details={})
    db.session.add(log)
    db.session.commit()

    return jsonify({'message': 'Mot de passe modifié avec succès'})


@profile_bp.route('/api/user/account', methods=['DELETE'])
@login_required
def delete_account():
    user = db.session.get(User, g.current_user_id)
    if not user:
        return jsonify({'error': 'Utilisateur introuvable'}), 404

    data = request.get_json() or {}
    password = data.get('password', '')
    if not password:
        return jsonify({'error': 'Mot de passe requis'}), 400
    if not check_password_hash(user.password_hash, password):
        return jsonify({'error': 'Mot de passe incorrect'}), 401

    upload_folder = current_app.config.get('UPLOAD_FOLDER', '/app/uploads')

    # Delete avatar file from disk
    if user.avatar_url and user.avatar_url.startswith('/api/user/avatar/'):
        avatar_path = os.path.join(upload_folder, 'avatars', user.avatar_url.split('/')[-1])
        if os.path.exists(avatar_path):
            try:
                os.remove(avatar_path)
            except OSError:
                pass

    # Collect all file IDs owned by user (for FK cleanup)
    file_ids = [f.id for f in File.query.filter_by(owner_id=user.id).all()]

    if file_ids:
        # Delete physical files from disk
        for f in File.query.filter(File.id.in_(file_ids), File.is_folder == False).all():
            if f.storage_path and os.path.exists(f.storage_path):
                try:
                    os.remove(f.storage_path)
                except OSError:
                    pass

        # Remove FK references before deleting files
        ActivityLog.query.filter(ActivityLog.file_id.in_(file_ids)).delete(synchronize_session=False)
        SharedFile.query.filter(SharedFile.file_id.in_(file_ids)).delete(synchronize_session=False)
        # Break self-referential parent_id before deleting
        db.session.execute(text('UPDATE file SET parent_id = NULL WHERE owner_id = :uid'), {'uid': user.id})
        db.session.flush()
        File.query.filter_by(owner_id=user.id).delete(synchronize_session=False)

    # Delete remaining user-related records
    ActivityLog.query.filter_by(user_id=user.id).delete(synchronize_session=False)
    SharedFile.query.filter(
        (SharedFile.shared_by_id == user.id) | (SharedFile.shared_with_id == user.id)
    ).delete(synchronize_session=False)
    UserSettings.query.filter_by(user_id=user.id).delete(synchronize_session=False)
    EmailVerificationToken.query.filter_by(user_id=user.id).delete(synchronize_session=False)

    db.session.delete(user)
    db.session.commit()

    logger.info(f'Account deleted: {user.email}')
    return jsonify({'message': 'Compte supprimé avec succès'}), 200
