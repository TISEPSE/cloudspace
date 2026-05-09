import os
from flask import Blueprint, request, jsonify, g
from sqlalchemy import or_
from src.extensions import db
from src.models import File
from src.utils import format_file_size, format_relative_time
from src.auth import login_required

search_bp = Blueprint('search', __name__)

TYPE_MIME_MAP = {
    'image':       ['image/'],
    'video':       ['video/'],
    'audio':       ['audio/'],
    'document':    ['application/pdf', 'application/msword',
                    'application/vnd.openxmlformats-officedocument'],
    'spreadsheet': ['application/vnd.ms-excel',
                    'application/vnd.openxmlformats-officedocument.spreadsheetml'],
    'archive':     ['application/zip', 'application/x-rar', 'application/x-7z',
                    'application/gzip'],
    'code':        ['text/javascript', 'text/typescript', 'text/html',
                    'text/css', 'application/json', 'application/xml'],
}


@search_bp.route('/api/search')
@login_required
def search():
    q = request.args.get('q', '').strip()
    file_type = request.args.get('type', '')
    limit = request.args.get('limit', 30, type=int)

    if not q or len(q) < 2:
        return jsonify({'results': [], 'total': 0})

    query = File.query.filter(
        File.owner_id == g.current_user_id,
        File.is_trashed == False,
        File.name.ilike(f'%{q}%'),
    )

    if file_type and file_type in TYPE_MIME_MAP:
        prefixes = TYPE_MIME_MAP[file_type]
        query = query.filter(or_(*[File.mime_type.like(p + '%') for p in prefixes]))

    results = query.order_by(File.updated_at.desc()).limit(limit).all()

    return jsonify({
        'results': [{
            'id': f.id,
            'name': f.name,
            'is_folder': f.is_folder,
            'mime_type': f.mime_type,
            'size': f.size,
            'formatted_size': format_file_size(f.size) if f.size else '--',
            'icon': f.icon,
            'icon_color': f.icon_color,
            'icon_bg': f.icon_bg or 'bg-slate-50',
            'parent_id': f.parent_id,
            'has_content': bool(f.storage_path and os.path.exists(f.storage_path)),
            'updated_at': f.updated_at.isoformat() + 'Z' if f.updated_at else None,
            'relative_time': format_relative_time(f.updated_at) if f.updated_at else None,
        } for f in results],
        'total': len(results),
        'query': q,
    })
