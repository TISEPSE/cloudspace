import uuid
from datetime import datetime, timezone
from src.extensions import db


def generate_uuid():
    return str(uuid.uuid4())


class User(db.Model):
    __tablename__ = 'user'

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    first_name = db.Column(db.String(50), nullable=False)
    last_name = db.Column(db.String(50), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    bio = db.Column(db.Text, nullable=True)
    avatar_url = db.Column(db.String(500), nullable=True)
    role = db.Column(db.String(50), default='member')
    is_online = db.Column(db.Boolean, default=False)
    is_verified = db.Column(db.Boolean, default=False)
    storage_used = db.Column(db.BigInteger, default=0)
    storage_limit = db.Column(db.BigInteger, default=21474836480)  # 20 GB
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))

    files = db.relationship('File', backref='owner', lazy='dynamic',
                            foreign_keys='File.owner_id')
    activities = db.relationship('ActivityLog', backref='user', lazy='dynamic')


class File(db.Model):
    __tablename__ = 'file'

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    name = db.Column(db.String(255), nullable=False)
    is_folder = db.Column(db.Boolean, default=False)
    mime_type = db.Column(db.String(100), nullable=True)
    size = db.Column(db.BigInteger, default=0)
    icon = db.Column(db.String(50), nullable=False)
    icon_color = db.Column(db.String(50), nullable=False)
    icon_bg = db.Column(db.String(100), nullable=True)

    parent_id = db.Column(db.String(36), db.ForeignKey('file.id'), nullable=True)
    owner_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)

    is_starred = db.Column(db.Boolean, default=False)
    is_locked = db.Column(db.Boolean, default=False)
    lock_password_hash = db.Column(db.String(256), nullable=True)
    is_trashed = db.Column(db.Boolean, default=False)
    trashed_at = db.Column(db.DateTime, nullable=True)
    original_parent_id = db.Column(db.String(36), nullable=True)

    storage_path = db.Column(db.String(500), nullable=True)
    preview_url = db.Column(db.String(500), nullable=True)

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))

    children = db.relationship('File', backref=db.backref('parent', remote_side='File.id'),
                               lazy='dynamic')
    activities = db.relationship('ActivityLog', backref='file', lazy='dynamic')

    __table_args__ = (
        db.Index('ix_file_owner_parent', 'owner_id', 'parent_id'),
        db.Index('ix_file_owner_starred', 'owner_id', 'is_starred'),
        db.Index('ix_file_owner_trashed', 'owner_id', 'is_trashed'),
        db.Index('ix_file_owner_updated', 'owner_id', 'updated_at'),
    )


class UserSettings(db.Model):
    __tablename__ = 'user_settings'

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), unique=True, nullable=False)
    theme = db.Column(db.String(20), default='dark')
    font_size = db.Column(db.String(10), default='medium')
    compact_mode = db.Column(db.Boolean, default=False)
    sidebar_position = db.Column(db.String(10), default='left')
    sidebar_hover = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))

    user = db.relationship('User', backref=db.backref('settings', uselist=False))


class TokenBlocklist(db.Model):
    __tablename__ = 'token_blocklist'

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    jti = db.Column(db.String(36), unique=True, nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))


class SharedFile(db.Model):
    __tablename__ = 'shared_file'

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    file_id = db.Column(db.String(36), db.ForeignKey('file.id'), nullable=False)
    shared_by_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)
    shared_with_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)
    permission = db.Column(db.String(10), default='viewer')  # viewer, editor
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    file = db.relationship('File', backref='shares', foreign_keys=[file_id])
    shared_by = db.relationship('User', foreign_keys=[shared_by_id])
    shared_with = db.relationship('User', foreign_keys=[shared_with_id])


class ActivityLog(db.Model):
    __tablename__ = 'activity_log'

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)
    file_id = db.Column(db.String(36), db.ForeignKey('file.id'), nullable=True)
    action = db.Column(db.String(50), nullable=False)
    details = db.Column(db.JSON, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc),
                           index=True)


class GitHubConnection(db.Model):
    __tablename__ = 'github_connection'

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), unique=True, nullable=False)
    github_user_id = db.Column(db.String(50), nullable=False)
    github_username = db.Column(db.String(100), nullable=False)
    github_avatar_url = db.Column(db.String(500), nullable=True)
    github_name = db.Column(db.String(200), nullable=True)
    access_token = db.Column(db.String(500), nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))

    user = db.relationship('User', backref=db.backref('github_connection', uselist=False))


class EmailVerificationToken(db.Model):
    __tablename__ = 'email_verification_token'

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)
    token = db.Column(db.String(64), unique=True, nullable=False, index=True)
    expires_at = db.Column(db.DateTime, nullable=False)
    used = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    user = db.relationship('User', backref=db.backref('verification_tokens', lazy='dynamic'))


class PasswordResetToken(db.Model):
    __tablename__ = 'password_reset_token'

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)
    token = db.Column(db.String(64), unique=True, nullable=False, index=True)
    expires_at = db.Column(db.DateTime, nullable=False)
    used = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    user = db.relationship('User', backref=db.backref('reset_tokens', lazy='dynamic'))


class DevicePairing(db.Model):
    """Pairing ephemere pour connecter un appareil mobile via QR code."""
    __tablename__ = 'device_pairing'

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False, index=True)
    token = db.Column(db.String(64), unique=True, nullable=False, index=True)
    expires_at = db.Column(db.DateTime, nullable=False)
    used_at = db.Column(db.DateTime, nullable=True)
    created_ip = db.Column(db.String(45), nullable=True)
    consumed_ip = db.Column(db.String(45), nullable=True)
    consumed_ua = db.Column(db.String(500), nullable=True)
    device_id = db.Column(db.String(64), nullable=True)
    device_label = db.Column(db.String(120), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    user = db.relationship('User', backref=db.backref('device_pairings', lazy='dynamic'))
