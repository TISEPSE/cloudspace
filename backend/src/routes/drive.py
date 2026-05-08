import os
from flask import Blueprint, request, jsonify, g
from src.extensions import db
from src.models import File, ActivityLog
from src.utils import format_file_size, format_relative_time
from src.auth import login_required

drive_bp = Blueprint('drive', __name__)


def build_breadcrumbs(folder):
    """Build breadcrumb trail from a folder up to root."""
    crumbs = [{'id': None, 'name': 'My Drive'}]
    if folder is None:
        return crumbs

    chain = []
    current = folder
    while current is not None:
        chain.append({'id': current.id, 'name': current.name})
        current = current.parent
    chain.reverse()
    return crumbs + chain


@drive_bp.route('/api/drive/contents')
@login_required
def drive_contents():
    parent_id = request.args.get('parent_id', None)
    sort_by = request.args.get('sort', 'name')
    order = request.args.get('order', 'asc')

    if parent_id in ('null', '', 'undefined'):
        parent_id = None

    # Build query
    query = File.query.filter_by(
        owner_id=g.current_user_id,
        is_trashed=False,
    )

    if parent_id:
        query = query.filter_by(parent_id=parent_id)
    else:
        query = query.filter(File.parent_id.is_(None))

    # Sort
    if sort_by == 'size':
        sort_col = File.size
    elif sort_by == 'modified':
        sort_col = File.updated_at
    else:
        sort_col = File.name

    if order == 'desc':
        sort_col = sort_col.desc()

    items = query.order_by(sort_col).all()

    # Separate folders and files
    folders = []
    files = []

    for item in items:
        if item.is_folder:
            items_count = File.query.filter_by(
                parent_id=item.id, is_trashed=False
            ).count()
            folders.append({
                'id': item.id,
                'name': item.name,
                'items_count': items_count,
                'icon': item.icon,
                'icon_color': item.icon_color,
                'icon_bg': item.icon_bg or 'bg-yellow-50 dark:bg-yellow-500/10',
                'is_locked': item.is_locked,
                'is_starred': item.is_starred,
                'parent_id': item.parent_id,
                'created_at': item.created_at.isoformat() + 'Z' if item.created_at else None,
                'updated_at': item.updated_at.isoformat() + 'Z' if item.updated_at else None,
            })
        else:
            has_content = bool(item.storage_path and os.path.exists(item.storage_path))
            files.append({
                'id': item.id,
                'name': item.name,
                'size': item.size,
                'formatted_size': format_file_size(item.size),
                'icon': item.icon,
                'icon_color': item.icon_color,
                'icon_bg': item.icon_bg or 'bg-slate-50 dark:bg-[#151e26]',
                'mime_type': item.mime_type,
                'is_starred': item.is_starred,
                'is_locked': item.is_locked,
                'has_content': has_content,
                'parent_id': item.parent_id,
                'updated_at': item.updated_at.isoformat() + 'Z' if item.updated_at else None,
                'formatted_date': format_relative_time(item.updated_at),
            })

    # Breadcrumbs
    current_folder = None
    if parent_id:
        current_folder = db.session.get(File, parent_id)

    breadcrumbs = build_breadcrumbs(current_folder)

    result = {
        'current_folder': {
            'id': current_folder.id if current_folder else None,
            'name': current_folder.name if current_folder else 'My Drive',
            'parent_id': current_folder.parent_id if current_folder else None,
        },
        'breadcrumbs': breadcrumbs,
        'folders': folders,
        'files': files,
    }

    return jsonify(result)


@drive_bp.route('/api/drive/folders', methods=['POST'])
@login_required
def create_folder():
    data = request.get_json()
    name = data.get('name', '').strip()
    parent_id = data.get('parent_id')

    if not name:
        return jsonify({'error': 'Folder name is required'}), 400
    if len(name) > 255:
        return jsonify({'error': 'Folder name must be 255 characters or less'}), 400

    if parent_id in ('null', '', 'undefined', None):
        parent_id = None

    # Check duplicate name
    existing = File.query.filter_by(
        owner_id=g.current_user_id,
        parent_id=parent_id,
        name=name,
        is_folder=True,
        is_trashed=False,
    ).first()

    if existing:
        return jsonify({'error': 'Folder name already exists in this location'}), 400

    folder = File(
        name=name,
        is_folder=True,
        icon='folder',
        icon_color='text-yellow-500',
        owner_id=g.current_user_id,
        parent_id=parent_id,
    )
    db.session.add(folder)

    log = ActivityLog(
        user_id=g.current_user_id,
        file_id=folder.id,
        action='folder_created',
    )
    db.session.add(log)
    db.session.commit()

    return jsonify({
        'id': folder.id,
        'name': folder.name,
        'is_folder': True,
        'parent_id': folder.parent_id,
        'created_at': folder.created_at.isoformat() + 'Z',
    }), 201
