import pytest
import os
import jwt
from datetime import datetime, timezone, timedelta
from werkzeug.security import generate_password_hash
from src import create_app
from src.extensions import db as _db


@pytest.fixture(scope='session')
def app():
    os.environ['SECRET_KEY'] = 'test-secret-key-for-pytest-only-do-not-use-in-production'
    os.environ['DATABASE_URL'] = 'sqlite:///:memory:'
    os.environ['UPLOAD_FOLDER'] = '/tmp/cloudspace_test_uploads'
    os.environ['RATELIMIT_ENABLED'] = 'False'
    os.environ['CLAMAV_ENABLED'] = 'false'
    os.environ['ALLOWED_ORIGINS'] = 'http://localhost:5173'
    os.makedirs('/tmp/cloudspace_test_uploads/files', exist_ok=True)
    os.makedirs('/tmp/cloudspace_test_uploads/avatars', exist_ok=True)
    os.makedirs('/tmp/cloudspace_test_uploads/previews', exist_ok=True)
    app = create_app()
    app.config['TESTING'] = True
    app.config['RATELIMIT_ENABLED'] = False
    return app


@pytest.fixture(scope='function')
def db(app):
    with app.app_context():
        _db.create_all()
        yield _db
        _db.session.remove()
        _db.drop_all()


@pytest.fixture(scope='function')
def client(app, db):
    return app.test_client()


@pytest.fixture(scope='function')
def test_user(app, db):
    """Creates and returns a test user with known credentials."""
    from src.models import User
    with app.app_context():
        user = User(
            first_name='Test',
            last_name='User',
            email='testuser@cloudspace.test',
            password_hash=generate_password_hash('testpassword'),
            is_verified=True,
        )
        _db.session.add(user)
        _db.session.commit()
        _db.session.refresh(user)
        return user.id


@pytest.fixture(scope='function')
def auth_headers(app, test_user):
    """JWT Bearer token for the test user."""
    with app.app_context():
        token = jwt.encode(
            {
                'sub': test_user,
                'type': 'access',
                'iat': datetime.now(timezone.utc),
                'exp': datetime.now(timezone.utc) + timedelta(hours=1),
            },
            app.config['SECRET_KEY'],
            algorithm='HS256',
        )
        return {'Authorization': f'Bearer {token}'}
