import os
import uuid
import logging
import magic
from flask import Blueprint, request, jsonify, current_app, send_file, g
from werkzeug.utils import secure_filename
from src.extensions import db
from src.models import File, User, ActivityLog, SharedFile
from src.utils import get_icon_for_mime, format_file_size, format_relative_time
from src.auth import login_required, media_or_login_required
from src.clamav import scan_file as antivirus_scan, ClamAVError, is_enabled as antivirus_enabled
from src.sync import hub as sync_hub

logger = logging.getLogger(__name__)

files_bp = Blueprint('files', __name__)

MAX_FILE_SIZE = 100 * 1024 * 1024  # 100 MB per file

ALLOWED_EXTENSIONS = {
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.txt', '.csv', '.md', '.rtf',
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.ico',
    '.mp4', '.mov', '.avi', '.mkv', '.webm',
    '.mp3', '.wav', '.ogg', '.flac', '.aac',
    '.zip', '.rar', '.7z', '.tar', '.gz',
    '.json', '.xml', '.html', '.css', '.js', '.ts',
}

ALLOWED_MIME_PREFIXES = [
    'image/', 'video/', 'audio/', 'text/',
    'application/pdf', 'application/json', 'application/xml',
    'application/zip', 'application/x-rar', 'application/x-7z',
    'application/msword', 'application/vnd.openxmlformats-officedocument',
    'application/vnd.ms-excel', 'application/vnd.ms-powerpoint',
]

BLOCKED_MIME_TYPES = {'image/svg+xml', 'text/html', 'application/xhtml+xml'}


@files_bp.route('/api/files/upload', methods=['POST'])
@login_required
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'Aucun fichier fourni'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'Aucun fichier sélectionné'}), 400

    # Sanitize filename
    original_name = file.filename
    safe_name = secure_filename(file.filename)
    if not safe_name:
        return jsonify({'error': 'Nom de fichier invalide'}), 400

    # Validate extension
    ext = os.path.splitext(safe_name)[1].lower()
    if ext and ext not in ALLOWED_EXTENSIONS:
        return jsonify({'error': f'Type de fichier {ext} non autorisé'}), 400

    # Validate MIME type via magic bytes (ignores browser-supplied Content-Type)
    real_mime = magic.from_buffer(file.read(2048), mime=True)
    file.seek(0)
    if real_mime in BLOCKED_MIME_TYPES:
        return jsonify({'error': f'Type de fichier {real_mime} non autorisé'}), 400
    if not any(real_mime.startswith(p) for p in ALLOWED_MIME_PREFIXES):
        return jsonify({'error': f'Type de fichier {real_mime} non autorisé'}), 400
    mime_type = real_mime

    # Check file size
    file.seek(0, os.SEEK_END)
    file_size = file.tell()
    file.seek(0)
    if file_size > MAX_FILE_SIZE:
        return jsonify({'error': 'Fichier trop volumineux. Taille maximale : 100 Mo'}), 413

    # Check user storage quota
    user = db.session.get(User, g.current_user_id)
    if user and (user.storage_used + file_size) > user.storage_limit:
        return jsonify({'error': 'Quota de stockage dépassé. Libérez de l\'espace ou améliorez votre offre.'}), 413

    parent_id = request.form.get('parent_id')
    if parent_id in ('null', '', 'undefined', 'None'):
        parent_id = None

    # Save to user-specific directory
    upload_folder = current_app.config['UPLOAD_FOLDER']
    user_dir = os.path.join(upload_folder, 'files', g.current_user_id)
    os.makedirs(user_dir, exist_ok=True)

    file_uuid = str(uuid.uuid4())
    stored_name = file_uuid + ext
    save_path = os.path.join(user_dir, stored_name)

    # Annonce l'arrivée d'un upload aux autres appareils du même user :
    # une tuile placeholder apparaît immédiatement sur PC pendant le scan AV / save.
    temp_id = 'tmp-' + file_uuid
    icon_preview, icon_color_preview, icon_bg_preview = get_icon_for_mime(mime_type, original_name)
    sync_hub.publish(g.current_user_id, 'upload:started', {
        'temp_id': temp_id,
        'name': original_name,
        'size': file_size,
        'mime_type': mime_type,
        'icon': icon_preview,
        'icon_color': icon_color_preview,
        'icon_bg': icon_bg_preview,
        'parent_id': parent_id,
    })

    file.save(save_path)

    # Scan antivirus (fail-closed : si ClamAV est activé mais injoignable, on refuse)
    if antivirus_enabled():
        try:
            clean, signature = antivirus_scan(save_path)
        except ClamAVError as e:
            os.remove(save_path)
            logger.error('Upload rejected (ClamAV error): %s', e)
            return jsonify({'error': 'Antivirus indisponible, réessayez plus tard'}), 503
        if not clean:
            os.remove(save_path)
            logger.warning('Upload rejected (malware): %s detected %s', original_name, signature)
            return jsonify({'error': f'Fichier infecté détecté : {signature}'}), 422

    file_size = os.path.getsize(save_path)

    icon, icon_color, icon_bg = get_icon_for_mime(mime_type, original_name)

    new_file = File(
        name=original_name,
        is_folder=False,
        mime_type=mime_type,
        size=file_size,
        icon=icon,
        icon_color=icon_color,
        icon_bg=icon_bg,
        owner_id=g.current_user_id,
        parent_id=parent_id,
        storage_path=save_path,
    )
    db.session.add(new_file)
    db.session.flush()  # ensure new_file.id is set before creating the activity log

    # Update user storage usage
    if user:
        user.storage_used = (user.storage_used or 0) + file_size

    log = ActivityLog(
        user_id=g.current_user_id,
        file_id=new_file.id,
        action='file_uploaded',
        details={'size': file_size},
    )
    db.session.add(log)
    db.session.commit()
    logger.info('File uploaded: %s (%s bytes) by user %s', new_file.name, file_size, g.current_user_id)

    payload = {
        'id': new_file.id,
        'temp_id': temp_id,
        'name': new_file.name,
        'size': new_file.size,
        'formatted_size': format_file_size(new_file.size),
        'mime_type': new_file.mime_type,
        'icon': new_file.icon,
        'icon_color': new_file.icon_color,
        'icon_bg': new_file.icon_bg,
        'created_at': new_file.created_at.isoformat() + 'Z',
        'parent_id': new_file.parent_id,
    }
    sync_hub.publish(g.current_user_id, 'file:created', payload)
    return jsonify(payload), 201


@files_bp.route('/api/files/<file_id>', methods=['DELETE'])
@login_required
def trash_file(file_id):
    from datetime import datetime, timezone

    f = File.query.filter_by(id=file_id, owner_id=g.current_user_id).first()
    if not f:
        return jsonify({'error': 'Fichier introuvable'}), 404

    now = datetime.now(timezone.utc)
    f.original_parent_id = f.parent_id
    f.is_trashed = True
    f.trashed_at = now

    # If folder, trash children recursively
    if f.is_folder:
        _trash_children(f.id, now)

    log = ActivityLog(
        user_id=g.current_user_id,
        file_id=f.id,
        action='file_trashed',
    )
    db.session.add(log)
    db.session.commit()
    logger.info('File trashed: %s by user %s', f.name, g.current_user_id)

    sync_hub.publish(g.current_user_id, 'file:deleted', {
        'id': f.id,
        'parent_id': f.original_parent_id,
        'is_folder': f.is_folder,
    })
    return jsonify({
        'id': f.id,
        'is_trashed': True,
        'trashed_at': f.trashed_at.isoformat() + 'Z',
    })


def _trash_children(folder_id, now):
    children = File.query.filter_by(parent_id=folder_id, is_trashed=False).all()
    for child in children:
        child.original_parent_id = child.parent_id
        child.is_trashed = True
        child.trashed_at = now
        if child.is_folder:
            _trash_children(child.id, now)


@files_bp.route('/api/files/<file_id>/download')
@media_or_login_required
def download_file(file_id):
    f = File.query.filter_by(id=file_id, owner_id=g.current_user_id).first()
    if not f or not f.storage_path:
        return jsonify({'error': 'Fichier introuvable'}), 404

    if not os.path.exists(f.storage_path):
        return jsonify({'error': 'Fichier introuvable sur le disque'}), 404

    inline = request.args.get('inline') == 'true'
    logger.info('File downloaded: %s by user %s', f.name, g.current_user_id)
    return send_file(
        f.storage_path,
        mimetype=f.mime_type or 'application/octet-stream',
        as_attachment=not inline,
        download_name=f.name,
    )


@files_bp.route('/api/files/<file_id>/star', methods=['PUT'])
@login_required
def toggle_star(file_id):
    f = File.query.filter_by(id=file_id, owner_id=g.current_user_id).first()
    if not f:
        return jsonify({'error': 'Fichier introuvable'}), 404

    f.is_starred = not f.is_starred
    action = 'file_starred' if f.is_starred else 'file_unstarred'

    log = ActivityLog(
        user_id=g.current_user_id,
        file_id=f.id,
        action=action,
    )
    db.session.add(log)
    db.session.commit()

    return jsonify({
        'id': f.id,
        'is_starred': f.is_starred,
    })


@files_bp.route('/api/files/<file_id>/rename', methods=['PUT'])
@login_required
def rename_file(file_id):
    data = request.get_json()
    new_name = data.get('name', '').strip()

    if not new_name:
        return jsonify({'error': 'Le nom est requis'}), 400
    if len(new_name) > 255:
        return jsonify({'error': 'Le nom ne peut pas dépasser 255 caractères'}), 400

    f = File.query.filter_by(id=file_id, owner_id=g.current_user_id).first()
    if not f:
        return jsonify({'error': 'Fichier introuvable'}), 404

    # Check duplicate
    existing = File.query.filter(
        File.owner_id == g.current_user_id,
        File.parent_id == f.parent_id,
        File.name == new_name,
        File.id != f.id,
        File.is_trashed == False,
    ).first()

    if existing:
        return jsonify({'error': 'Un fichier avec ce nom existe déjà à cet emplacement'}), 400

    old_name = f.name
    f.name = new_name

    log = ActivityLog(
        user_id=g.current_user_id,
        file_id=f.id,
        action='file_renamed',
        details={'old_name': old_name, 'new_name': new_name},
    )
    db.session.add(log)
    db.session.commit()

    return jsonify({
        'id': f.id,
        'name': f.name,
        'updated_at': f.updated_at.isoformat() + 'Z' if f.updated_at else None,
    })


def _is_descendant(potential_child_id, ancestor_id):
    """Return True if potential_child_id is inside ancestor_id's subtree."""
    item = db.session.get(File, potential_child_id)
    while item and item.parent_id:
        if item.parent_id == ancestor_id:
            return True
        item = db.session.get(File, item.parent_id)
    return False


@files_bp.route('/api/files/<file_id>/lock', methods=['PUT'])
@login_required
def toggle_lock(file_id):
    from werkzeug.security import generate_password_hash, check_password_hash

    f = File.query.filter_by(id=file_id, owner_id=g.current_user_id, is_folder=True).first()
    if not f:
        return jsonify({'error': 'Dossier introuvable'}), 404

    data = request.get_json() or {}
    password = data.get('password', '').strip()

    if not f.is_locked:
        if not password or len(password) < 6:
            return jsonify({'error': 'Le mot de passe doit contenir au moins 6 caractères'}), 400
        f.is_locked = True
        f.lock_password_hash = generate_password_hash(password)
        action = 'file_locked'
    else:
        if not password:
            return jsonify({'error': 'Mot de passe requis'}), 400
        if not f.lock_password_hash or not check_password_hash(f.lock_password_hash, password):
            return jsonify({'error': 'Mot de passe incorrect'}), 403
        f.is_locked = False
        f.lock_password_hash = None
        action = 'file_unlocked'

    db.session.add(ActivityLog(user_id=g.current_user_id, file_id=f.id, action=action))
    db.session.commit()
    return jsonify({'id': f.id, 'is_locked': f.is_locked})


@files_bp.route('/api/files/<file_id>/verify-lock', methods=['POST'])
@login_required
def verify_lock(file_id):
    from werkzeug.security import check_password_hash

    f = File.query.filter_by(id=file_id, owner_id=g.current_user_id, is_folder=True).first()
    if not f:
        return jsonify({'error': 'Dossier introuvable'}), 404

    if not f.is_locked:
        return jsonify({'verified': True})

    data = request.get_json() or {}
    password = data.get('password', '').strip()
    if not password or not f.lock_password_hash:
        return jsonify({'error': 'Mot de passe requis'}), 400

    if not check_password_hash(f.lock_password_hash, password):
        return jsonify({'verified': False, 'error': 'Mot de passe incorrect'}), 403

    return jsonify({'verified': True})


@files_bp.route('/api/files/<file_id>/move', methods=['POST'])
@login_required
def move_file(file_id):
    f = File.query.filter_by(id=file_id, owner_id=g.current_user_id).first()
    if not f:
        return jsonify({'error': 'Fichier introuvable'}), 404

    data = request.get_json() or {}
    destination_id = data.get('destination_id') or None
    if destination_id in ('null', '', 'undefined', 'None'):
        destination_id = None

    if destination_id:
        dest = File.query.filter_by(id=destination_id, owner_id=g.current_user_id, is_folder=True).first()
        if not dest:
            return jsonify({'error': 'Dossier de destination introuvable'}), 404
        if destination_id == file_id:
            return jsonify({'error': 'Impossible de déplacer un dossier dans lui-même'}), 400
        if f.is_folder and _is_descendant(destination_id, file_id):
            return jsonify({'error': 'Impossible de déplacer un dossier dans l\'un de ses sous-dossiers'}), 400

    existing = File.query.filter(
        File.owner_id == g.current_user_id,
        File.parent_id == destination_id,
        File.name == f.name,
        File.id != f.id,
        File.is_trashed == False,
    ).first()
    if existing:
        return jsonify({'error': 'Un élément avec ce nom existe déjà à la destination'}), 400

    old_parent = f.parent_id
    f.parent_id = destination_id
    db.session.add(ActivityLog(
        user_id=g.current_user_id, file_id=f.id, action='file_moved',
        details={'from': old_parent, 'to': destination_id},
    ))
    db.session.commit()
    return jsonify({'id': f.id, 'parent_id': f.parent_id})


@files_bp.route('/api/files/<file_id>', methods=['GET'])
@login_required
def get_file_details(file_id):
    import hashlib

    f = File.query.filter_by(id=file_id, owner_id=g.current_user_id).first()
    if not f:
        return jsonify({'error': 'Fichier introuvable'}), 404

    # Build path
    path_parts = []
    current = f.parent
    while current:
        path_parts.insert(0, current.name)
        current = current.parent
    path = '/My Drive' + ('/' + '/'.join(path_parts) if path_parts else '')

    # Owner email
    owner = db.session.get(User, f.owner_id)
    owner_email = owner.email if owner else None

    # SHA1 for files with content (skip if > 500 MB)
    sha1 = None
    has_content = bool(f.storage_path and os.path.exists(f.storage_path))
    if has_content and f.size and f.size <= 500 * 1024 * 1024:
        h = hashlib.sha1()
        with open(f.storage_path, 'rb') as fp:
            while chunk := fp.read(65536):
                h.update(chunk)
        sha1 = h.hexdigest()

    items_count = None
    if f.is_folder:
        items_count = File.query.filter_by(parent_id=f.id, is_trashed=False).count()

    # Métadonnées PDF
    pdf_meta = None
    if has_content and f.mime_type == 'application/pdf':
        try:
            from pypdf import PdfReader
            reader = PdfReader(f.storage_path)
            meta = reader.metadata or {}

            def clean(val):
                if val is None: return None
                s = str(val).strip()
                return s if s else None

            def parse_pdf_date(val):
                # Format: D:20230101120000+00'00'
                if not val: return None
                s = str(val).strip()
                if s.startswith("D:"):
                    s = s[2:]
                try:
                    from datetime import datetime, timezone
                    dt = datetime.strptime(s[:14], "%Y%m%d%H%M%S")
                    return dt.replace(tzinfo=timezone.utc).isoformat() + 'Z'
                except Exception:
                    return clean(val)

            pdf_meta = {
                'pages': len(reader.pages),
                'title': clean(meta.get('/Title')),
                'author': clean(meta.get('/Author')),
                'subject': clean(meta.get('/Subject')),
                'keywords': clean(meta.get('/Keywords')),
                'creator': clean(meta.get('/Creator')),
                'producer': clean(meta.get('/Producer')),
                'created_at': parse_pdf_date(meta.get('/CreationDate')),
                'modified_at': parse_pdf_date(meta.get('/ModDate')),
                'encrypted': reader.is_encrypted,
            }
        except Exception:
            pdf_meta = None

    return jsonify({
        'id': f.id,
        'name': f.name,
        'is_folder': f.is_folder,
        'mime_type': f.mime_type,
        'size': f.size,
        'formatted_size': format_file_size(f.size),
        'icon': f.icon,
        'icon_color': f.icon_color,
        'icon_bg': f.icon_bg or ('bg-yellow-50 dark:bg-yellow-500/10' if f.is_folder else 'bg-slate-50 dark:bg-[#151e26]'),
        'is_starred': f.is_starred,
        'is_locked': f.is_locked,
        'has_content': has_content,
        'created_at': f.created_at.isoformat() + 'Z' if f.created_at else None,
        'updated_at': f.updated_at.isoformat() + 'Z' if f.updated_at else None,
        'parent_id': f.parent_id,
        'owner_email': owner_email,
        'sha1': sha1,
        'path': path,
        'items_count': items_count,
        'pdf_meta': pdf_meta,
    })


@files_bp.route('/api/files/<file_id>/shares', methods=['GET'])
@login_required
def get_file_shares(file_id):
    f = File.query.filter_by(id=file_id, owner_id=g.current_user_id).first()
    if not f:
        return jsonify({'error': 'Fichier introuvable'}), 404

    shares = SharedFile.query.filter_by(file_id=file_id).all()
    return jsonify({'shares': [{
        'id': s.id,
        'email': s.shared_with.email,
        'name': f"{s.shared_with.first_name} {s.shared_with.last_name}",
        'permission': s.permission,
    } for s in shares]})


@files_bp.route('/api/files/<file_id>/share', methods=['POST'])
@login_required
def share_file(file_id):
    f = File.query.filter_by(id=file_id, owner_id=g.current_user_id).first()
    if not f:
        return jsonify({'error': 'Fichier introuvable'}), 404

    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    permission = data.get('permission', 'viewer')

    if not email:
        return jsonify({'error': 'L\'adresse e-mail est requise'}), 400
    if permission not in ('viewer', 'editor'):
        return jsonify({'error': 'Permission invalide'}), 400

    target_user = User.query.filter_by(email=email).first()
    if not target_user:
        return jsonify({'error': 'Aucun compte trouvé avec cette adresse e-mail'}), 404
    if target_user.id == g.current_user_id:
        return jsonify({'error': 'Vous ne pouvez pas partager un fichier avec vous-même'}), 400

    existing = SharedFile.query.filter_by(file_id=file_id, shared_with_id=target_user.id).first()
    if existing:
        existing.permission = permission
    else:
        db.session.add(SharedFile(
            file_id=file_id,
            shared_by_id=g.current_user_id,
            shared_with_id=target_user.id,
            permission=permission,
        ))
        db.session.add(ActivityLog(
            user_id=g.current_user_id, file_id=file_id, action='file_shared',
            details={'with': email, 'permission': permission},
        ))
    db.session.commit()

    return jsonify({
        'id': existing.id if existing else None,
        'email': target_user.email,
        'name': f"{target_user.first_name} {target_user.last_name}",
        'permission': permission,
    })


@files_bp.route('/api/files/<file_id>/shares/<share_id>', methods=['DELETE'])
@login_required
def unshare_file(file_id, share_id):
    f = File.query.filter_by(id=file_id, owner_id=g.current_user_id).first()
    if not f:
        return jsonify({'error': 'Fichier introuvable'}), 404

    share = SharedFile.query.filter_by(id=share_id, file_id=file_id).first()
    if not share:
        return jsonify({'error': 'Partage introuvable'}), 404

    db.session.delete(share)
    db.session.commit()
    return jsonify({'deleted': True})


def _add_folder_to_zip(zf, folder, prefix):
    children = File.query.filter_by(parent_id=folder.id, is_trashed=False).all()
    for child in children:
        if child.is_folder:
            _add_folder_to_zip(zf, child, f"{prefix}/{child.name}")
        elif child.storage_path and os.path.exists(child.storage_path):
            zf.write(child.storage_path, f"{prefix}/{child.name}")


@files_bp.route('/api/files/<file_id>/download-zip')
@login_required
def download_folder_zip(file_id):
    import io
    import zipfile

    folder = File.query.filter_by(id=file_id, owner_id=g.current_user_id, is_folder=True).first()
    if not folder:
        return jsonify({'error': 'Dossier introuvable'}), 404

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as zf:
        _add_folder_to_zip(zf, folder, folder.name)
    buf.seek(0)

    return send_file(
        buf,
        mimetype='application/zip',
        as_attachment=True,
        download_name=f"{folder.name}.zip",
    )


@files_bp.route('/api/files/starred', methods=['GET'])
@login_required
def list_starred():
    from sqlalchemy import func
    items = File.query.filter_by(
        owner_id=g.current_user_id,
        is_starred=True,
        is_trashed=False,
    ).order_by(File.updated_at.desc()).all()

    # Pre-fetch child counts for all folders in one query (avoid N+1)
    folder_ids = [f.id for f in items if f.is_folder]
    child_counts = {}
    if folder_ids:
        rows = (
            db.session.query(File.parent_id, func.count(File.id))
            .filter(File.parent_id.in_(folder_ids), File.is_trashed == False)
            .group_by(File.parent_id)
            .all()
        )
        child_counts = {parent_id: count for parent_id, count in rows}

    def serialize(f):
        import os as _os
        has_content = bool(f.storage_path and _os.path.exists(f.storage_path))
        return {
            'id': f.id,
            'name': f.name,
            'is_folder': f.is_folder,
            'mime_type': f.mime_type,
            'size': f.size,
            'formatted_size': format_file_size(f.size) if f.size else '--',
            'icon': f.icon,
            'icon_color': f.icon_color,
            'icon_bg': f.icon_bg or ('bg-yellow-50 dark:bg-yellow-500/10' if f.is_folder else 'bg-slate-50'),
            'is_starred': f.is_starred,
            'is_locked': f.is_locked,
            'has_content': has_content,
            'updated_at': f.updated_at.isoformat() + 'Z' if f.updated_at else None,
            'relative_time': format_relative_time(f.updated_at) if f.updated_at else None,
            'formatted_date': format_relative_time(f.updated_at) if f.updated_at else None,
            'items_count': child_counts.get(f.id, 0) if f.is_folder else None,
        }

    folders = [serialize(f) for f in items if f.is_folder]
    files = [serialize(f) for f in items if not f.is_folder]
    return jsonify({'folders': folders, 'files': files})



@files_bp.route('/api/files/gallery', methods=['GET'])
@login_required
def list_gallery():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 60, type=int)

    query = File.query.filter(
        File.owner_id == g.current_user_id,
        File.is_trashed == False,
        File.is_folder == False,
        File.mime_type.like('image/%'),
    ).order_by(File.created_at.desc())

    total = query.count()
    images = query.offset((page - 1) * per_page).limit(per_page).all()

    return jsonify({
        'images': [{
            'id': f.id,
            'name': f.name,
            'mime_type': f.mime_type,
            'size': f.size,
            'formatted_size': format_file_size(f.size) if f.size else '--',
            'created_at': f.created_at.isoformat() + 'Z' if f.created_at else None,
            'has_content': bool(f.storage_path),
            'icon': f.icon or 'image',
            'icon_color': f.icon_color or 'text-indigo-500',
            'icon_bg': f.icon_bg or 'bg-indigo-50 dark:bg-indigo-500/10',
        } for f in images],
        'total': total,
        'page': page,
        'per_page': per_page,
        'has_more': (page * per_page) < total,
    })


@files_bp.route('/api/files/<file_id>/copy', methods=['POST'])
@login_required
def copy_file(file_id):
    import shutil

    f = File.query.filter_by(id=file_id, owner_id=g.current_user_id, is_folder=False).first()
    if not f:
        return jsonify({'error': 'Fichier introuvable'}), 404

    data = request.get_json() or {}
    destination_id = data.get('destination_id') or f.parent_id

    base, ext = os.path.splitext(f.name)
    copy_name = f"{base} (copie){ext}"
    counter = 2
    while File.query.filter_by(
        owner_id=g.current_user_id, parent_id=destination_id,
        name=copy_name, is_trashed=False,
    ).first():
        copy_name = f"{base} (copie {counter}){ext}"
        counter += 1

    new_storage_path = None
    if f.storage_path and os.path.exists(f.storage_path):
        upload_folder = current_app.config['UPLOAD_FOLDER']
        user_dir = os.path.join(upload_folder, 'files', g.current_user_id)
        os.makedirs(user_dir, exist_ok=True)
        new_uuid = str(uuid.uuid4())
        _, file_ext = os.path.splitext(f.storage_path)
        new_storage_path = os.path.join(user_dir, new_uuid + file_ext)
        shutil.copy2(f.storage_path, new_storage_path)

    new_file = File(
        name=copy_name,
        is_folder=False,
        mime_type=f.mime_type,
        size=f.size,
        icon=f.icon,
        icon_color=f.icon_color,
        icon_bg=f.icon_bg,
        owner_id=g.current_user_id,
        parent_id=destination_id,
        storage_path=new_storage_path,
    )
    db.session.add(new_file)

    user = db.session.get(User, g.current_user_id)
    if user and f.size:
        user.storage_used = (user.storage_used or 0) + f.size

    db.session.add(ActivityLog(
        user_id=g.current_user_id, file_id=new_file.id, action='file_copied',
        details={'original_id': file_id},
    ))
    db.session.commit()

    return jsonify({
        'id': new_file.id,
        'name': new_file.name,
        'mime_type': new_file.mime_type,
        'size': new_file.size,
        'formatted_size': format_file_size(new_file.size) if new_file.size else '--',
        'icon': new_file.icon,
        'icon_color': new_file.icon_color,
        'icon_bg': new_file.icon_bg,
        'parent_id': new_file.parent_id,
    }), 201
