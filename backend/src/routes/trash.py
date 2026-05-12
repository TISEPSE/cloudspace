import os
from flask import Blueprint, jsonify, g
from src.extensions import db
from src.models import File, User, ActivityLog
from src.utils import format_file_size, format_relative_time
from src.auth import login_required

trash_bp = Blueprint('trash', __name__)


@trash_bp.route('/api/trash')
@login_required
def list_trash():
    items = (
        File.query
        .filter_by(owner_id=g.current_user_id, is_trashed=True)
        .order_by(File.trashed_at.desc())
        .all()
    )

    def _build_location(f):
        if f.original_parent_id:
            parent = db.session.get(File, f.original_parent_id)
            if parent:
                return parent.name
        return 'Mon Drive'

    return jsonify({
        'items': [{
            'id': f.id,
            'name': f.name,
            'is_folder': f.is_folder,
            'icon': f.icon or ('folder' if f.is_folder else 'draft'),
            'icon_color': f.icon_color or ('text-yellow-500' if f.is_folder else 'text-slate-500'),
            'icon_bg': f.icon_bg or ('bg-yellow-50 dark:bg-yellow-500/10' if f.is_folder else 'bg-slate-50 dark:bg-slate-500/10'),
            'size': f.size,
            'formatted_size': format_file_size(f.size) if f.size else '--',
            'original_location': _build_location(f),
            'trashed_at': f.trashed_at.isoformat() + 'Z' if f.trashed_at else None,
            'trashed_relative': format_relative_time(f.trashed_at),
        } for f in items],
        'count': len(items),
    })


@trash_bp.route('/api/trash/<file_id>/restore', methods=['POST'])
@login_required
def restore_item(file_id):
    f = File.query.filter_by(
        id=file_id, owner_id=g.current_user_id, is_trashed=True
    ).first()
    if not f:
        return jsonify({'error': 'Élément introuvable dans la corbeille'}), 404

    f.is_trashed = False
    f.parent_id = f.original_parent_id
    f.original_parent_id = None
    f.trashed_at = None

    # Restore children if folder
    if f.is_folder:
        _restore_children(f.id)

    log = ActivityLog(
        user_id=g.current_user_id,
        file_id=f.id,
        action='file_restored',
    )
    db.session.add(log)
    db.session.commit()

    return jsonify({'id': f.id, 'restored': True})


def _restore_children(folder_id):
    children = File.query.filter_by(parent_id=folder_id, is_trashed=True).all()
    for child in children:
        child.is_trashed = False
        child.parent_id = child.original_parent_id or folder_id
        child.original_parent_id = None
        child.trashed_at = None
        if child.is_folder:
            _restore_children(child.id)


@trash_bp.route('/api/trash/<file_id>', methods=['DELETE'])
@login_required
def delete_permanently(file_id):
    f = File.query.filter_by(
        id=file_id, owner_id=g.current_user_id, is_trashed=True
    ).first()
    if not f:
        return jsonify({'error': 'Élément introuvable dans la corbeille'}), 404

    freed = _delete_file_tree(f)

    # Update user storage
    user = db.session.get(User, g.current_user_id)
    if user:
        user.storage_used = max(0, (user.storage_used or 0) - freed)

    db.session.commit()

    return jsonify({'id': file_id, 'deleted': True, 'freed': freed})


@trash_bp.route('/api/trash', methods=['DELETE'])
@login_required
def empty_trash():
    items = File.query.filter_by(
        owner_id=g.current_user_id, is_trashed=True
    ).all()

    # Only top-level trashed items (children will be handled recursively)
    total_freed = 0
    for f in items:
        total_freed += _delete_file_tree(f)

    user = db.session.get(User, g.current_user_id)
    if user:
        user.storage_used = max(0, (user.storage_used or 0) - total_freed)

    db.session.commit()

    return jsonify({'deleted_count': len(items), 'freed': total_freed})


def _delete_file_tree(f):
    """Permanently delete a file/folder and its children. Returns bytes freed."""
    freed = 0

    if f.is_folder:
        children = File.query.filter_by(parent_id=f.id).all()
        for child in children:
            freed += _delete_file_tree(child)

    # Delete physical file
    if f.storage_path and os.path.exists(f.storage_path):
        freed += os.path.getsize(f.storage_path)
        os.remove(f.storage_path)

    # Delete related activity logs
    ActivityLog.query.filter_by(file_id=f.id).delete()

    db.session.delete(f)
    return freed
