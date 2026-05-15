import os
import logging
import json
import sys
from flask import Flask
from dotenv import load_dotenv

load_dotenv()


class JsonFormatter(logging.Formatter):
    def format(self, record):
        log = {
            'level': record.levelname,
            'message': record.getMessage(),
            'logger': record.name,
        }
        if record.exc_info:
            log['exception'] = self.formatException(record.exc_info)
        return json.dumps(log)

def configure_logging():
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())
    root = logging.getLogger()
    root.handlers = []
    root.addHandler(handler)
    root.setLevel(logging.INFO)
    # Silence noisy loggers
    logging.getLogger('werkzeug').setLevel(logging.WARNING)

configure_logging()
logger = logging.getLogger(__name__)


def create_app():
    app = Flask(__name__)

    secret_key = os.getenv('SECRET_KEY')
    if not secret_key:
        raise RuntimeError(
            "SECRET_KEY environment variable is required. "
            "Set it in .env (use a long random string, e.g. `python -c \"import secrets; print(secrets.token_urlsafe(64))\"`)."
        )
    if len(secret_key) < 32:
        raise RuntimeError(
            "SECRET_KEY is too short (min 32 chars). Generate a strong one: "
            "`python -c \"import secrets; print(secrets.token_urlsafe(64))\"`."
        )
    app.config['SECRET_KEY'] = secret_key
    app.config['FRONTEND_URL'] = os.getenv('FRONTEND_URL', 'http://localhost:8080')
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///cloudspace.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['UPLOAD_FOLDER'] = os.getenv('UPLOAD_FOLDER', './uploads')
    app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024  # 500 MB

    # Ensure upload directories exist
    upload_folder = app.config['UPLOAD_FOLDER']
    os.makedirs(os.path.join(upload_folder, 'files'), exist_ok=True)
    os.makedirs(os.path.join(upload_folder, 'avatars'), exist_ok=True)
    os.makedirs(os.path.join(upload_folder, 'previews'), exist_ok=True)

    # Init extensions
    from src.extensions import db, migrate, cors, limiter
    db.init_app(app)
    migrate.init_app(app, db)
    if os.getenv('RATELIMIT_ENABLED', 'True').lower() == 'false':
        app.config['RATELIMIT_ENABLED'] = False
    limiter.init_app(app)

    raw_origins = os.getenv('ALLOWED_ORIGINS', '').strip()
    if not raw_origins:
        if app.debug or os.getenv('FLASK_ENV') == 'development':
            allowed_origins = ['http://localhost:5173']
        else:
            raise RuntimeError('ALLOWED_ORIGINS must be set in production (and not empty)')
    else:
        allowed_origins = [o.strip() for o in raw_origins.split(',') if o.strip()]
    if '*' in allowed_origins:
        raise RuntimeError('ALLOWED_ORIGINS cannot contain "*" — list explicit origins')
    # Always allow native Capacitor origins (used by the Android APK)
    for native_origin in ('capacitor://localhost', 'http://localhost', 'https://localhost'):
        if native_origin not in allowed_origins:
            allowed_origins.append(native_origin)
    cors.init_app(app, resources={r"/api/*": {"origins": allowed_origins}})

    # Security headers
    @app.after_request
    def set_security_headers(response):
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'SAMEORIGIN'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        # style-src-elem bloque l'injection de <style>/<link> ; style-src-attr autorise les styles inline React
        response.headers['Content-Security-Policy'] = (
            "default-src 'self'; "
            "style-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com; "
            "style-src-elem 'self' https://fonts.googleapis.com https://fonts.gstatic.com; "
            "style-src-attr 'unsafe-inline'; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data: blob: https://i.pravatar.cc; "
            "script-src 'self' https://challenges.cloudflare.com; "
            "frame-src https://challenges.cloudflare.com; "
            "connect-src 'self' https://challenges.cloudflare.com"
        )
        return response

    # Register blueprints
    from src.routes import register_blueprints
    register_blueprints(app)

    # Create tables and seed
    with app.app_context():
        from src.models import User, File, ActivityLog, UserSettings, TokenBlocklist, DevicePairing, DeviceSession  # noqa: F401
        db.create_all()
        from src.seed import seed_data
        seed_data()

    logger.info('CloudSpace app started', extra={})
    return app
