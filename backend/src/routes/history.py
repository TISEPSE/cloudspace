from collections import defaultdict
from datetime import datetime, timezone, timedelta
from flask import Blueprint, request, jsonify, g
from src.extensions import db
from src.models import ActivityLog, File
from src.auth import login_required

history_bp = Blueprint('history', __name__)

ACTION_ICONS = {
    'file_uploaded':   ('upload_file',              'text-green-500',  'bg-green-500/10'),
    'file_edited':     ('edit_document',             'text-blue-500',   'bg-blue-500/10'),
    'file_viewed':     ('visibility',                'text-slate-500',  'bg-slate-500/10'),
    'file_downloaded': ('download',                  'text-purple-500', 'bg-purple-500/10'),
    'file_renamed':    ('drive_file_rename_outline', 'text-orange-500', 'bg-orange-500/10'),
    'file_trashed':    ('delete',                    'text-red-500',    'bg-red-500/10'),
    'file_restored':   ('restore_from_trash',        'text-green-500',  'bg-green-500/10'),
    'file_starred':    ('star',                      'text-yellow-500', 'bg-yellow-500/10'),
    'file_unstarred':  ('star_border',               'text-slate-400',  'bg-slate-400/10'),
    'file_shared':     ('share',                     'text-indigo-500', 'bg-indigo-500/10'),
    'file_unshared':   ('person_remove',             'text-red-400',    'bg-red-400/10'),
    'file_moved':      ('drive_file_move',           'text-cyan-500',   'bg-cyan-500/10'),
    'file_copied':     ('content_copy',              'text-blue-400',   'bg-blue-400/10'),
    'file_locked':     ('lock',                      'text-slate-500',  'bg-slate-500/10'),
    'file_unlocked':   ('lock_open',                 'text-slate-400',  'bg-slate-400/10'),
    'file_deleted':    ('delete_forever',            'text-red-600',    'bg-red-600/10'),
    'folder_created':  ('create_new_folder',         'text-yellow-500', 'bg-yellow-500/10'),
    'comment_added':   ('comment',                   'text-teal-500',   'bg-teal-500/10'),
}

ACTION_LABELS = {
    'file_uploaded':   'Vous avez importé',
    'file_edited':     'Vous avez modifié',
    'file_viewed':     'Vous avez consulté',
    'file_downloaded': 'Vous avez téléchargé',
    'file_renamed':    'Vous avez renommé',
    'file_trashed':    'Vous avez mis à la corbeille',
    'file_restored':   'Vous avez restauré depuis la corbeille',
    'file_starred':    'Vous avez mis en favori',
    'file_unstarred':  'Vous avez retiré des favoris',
    'file_shared':     'Vous avez partagé',
    'file_unshared':   'Vous avez retiré le partage de',
    'file_moved':      'Vous avez déplacé',
    'file_copied':     'Vous avez copié',
    'file_locked':     'Vous avez verrouillé',
    'file_unlocked':   'Vous avez déverrouillé',
    'file_deleted':    'Vous avez supprimé définitivement',
    'folder_created':  'Vous avez créé le dossier',
    'comment_added':   'Vous avez commenté',
}

DEFAULT_ICON = ('history', 'text-slate-500', 'bg-slate-500/10')


@history_bp.route('/api/activity/history')
@login_required
def get_history():
    page = request.args.get('page', 1, type=int)
    per_page = 30

    total = ActivityLog.query.filter_by(user_id=g.current_user_id).count()

    activities = ActivityLog.query.filter_by(
        user_id=g.current_user_id,
    ).order_by(ActivityLog.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()

    now = datetime.now(timezone.utc)
    today = now.date()
    yesterday = (now - timedelta(days=1)).date()

    groups = defaultdict(list)
    group_order = []

    for act in activities:
        act_date = act.created_at.date() if act.created_at else today
        if act_date == today:
            label = "Aujourd'hui"
        elif act_date == yesterday:
            label = 'Hier'
        else:
            label = act.created_at.strftime('%-d %B %Y') if act.created_at else 'Plus tôt'

        if label not in group_order:
            group_order.append(label)

        file_obj = db.session.get(File, act.file_id) if act.file_id else None
        icon, icon_color, icon_bg = ACTION_ICONS.get(act.action, DEFAULT_ICON)
        action_label = ACTION_LABELS.get(act.action, act.action)
        time_str = act.created_at.strftime('%H:%M') if act.created_at else ''

        groups[label].append({
            'id': act.id,
            'action': action_label,
            'target': file_obj.name if file_obj else 'un élément',
            'target_id': act.file_id,
            'target_parent_id': file_obj.parent_id if file_obj else None,
            'icon': icon,
            'icon_color': icon_color,
            'icon_bg': icon_bg,
            'time': time_str,
            'created_at': act.created_at.isoformat() + 'Z' if act.created_at else None,
        })

    result = [{'date': d, 'events': groups[d]} for d in group_order]
    return jsonify({
        'groups': result,
        'total': total,
        'page': page,
        'per_page': per_page,
        'has_more': (page * per_page) < total,
    })
