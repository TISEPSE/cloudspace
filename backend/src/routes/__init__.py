from src.routes.auth import auth_bp
from src.routes.drive import drive_bp
from src.routes.files import files_bp
from src.routes.dashboard import dashboard_bp
from src.routes.storage import storage_bp
from src.routes.settings import settings_bp
from src.routes.trash import trash_bp
from src.routes.history import history_bp
from src.routes.sharing import sharing_bp
from src.routes.search import search_bp
from src.routes.profile import profile_bp
from src.routes.password_reset import password_reset_bp
from src.routes.health import health_bp
from src.routes.device_pair import device_pair_bp


def register_blueprints(app):
    app.register_blueprint(auth_bp)
    app.register_blueprint(drive_bp)
    app.register_blueprint(files_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(storage_bp)
    app.register_blueprint(settings_bp)
    app.register_blueprint(trash_bp)
    app.register_blueprint(history_bp)
    app.register_blueprint(sharing_bp)
    app.register_blueprint(search_bp)
    app.register_blueprint(profile_bp)
    app.register_blueprint(password_reset_bp)
    app.register_blueprint(health_bp)
    app.register_blueprint(device_pair_bp)
