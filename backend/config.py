import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
PROJECT_DIR = os.path.abspath(os.path.join(BASE_DIR, ".."))
INSTANCE_DIR = os.path.join(PROJECT_DIR, "instance")
UPLOAD_FOLDER = os.path.join(BASE_DIR, "static", "assets", "images", "uploads")

os.makedirs(INSTANCE_DIR, exist_ok=True)
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "detaildash-dev-secret-key-change-in-production")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    UPLOAD_FOLDER = UPLOAD_FOLDER
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB upload limit

    # PostgreSQL via DATABASE_URL, fallback to SQLite for local dev
    _db_url = os.environ.get("DATABASE_URL", "")
    # Fix legacy Heroku/Railway postgres:// scheme
    if _db_url.startswith("postgres://"):
        _db_url = _db_url.replace("postgres://", "postgresql://", 1)
    SQLALCHEMY_DATABASE_URI = _db_url or f"sqlite:///{os.path.join(INSTANCE_DIR, 'database.db')}"

    WTF_CSRF_ENABLED = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False
    SESSION_COOKIE_SECURE = True  # Requires HTTPS in production


def config_by_env():
    env = os.environ.get("FLASK_ENV", "development").lower()
    return ProductionConfig if env == "production" else DevelopmentConfig
