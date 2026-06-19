import os

from flask import Flask, session
from flask_migrate import Migrate
from flask_wtf.csrf import CSRFProtect

from config import config_by_env
from db import db, User, seed_db, _migrate_transactions

migrate = Migrate()
csrf = CSRFProtect()


def create_app():
    app = Flask(__name__, static_folder="static", template_folder="templates")
    app.config.from_object(config_by_env())

    # Extensions
    db.init_app(app)
    migrate.init_app(app, db)
    csrf.init_app(app)

    # Blueprints
    from routes.auth import auth_bp
    from routes.pages import pages_bp
    from routes.api import api_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(pages_bp)
    app.register_blueprint(api_bp)
    csrf.exempt(api_bp)  # API routes use JSON + session auth; no form CSRF needed

    # Inject logged-in user into every template context
    @app.context_processor
    def inject_current_user():
        uid = session.get("user_id")
        user = db.session.get(User, uid) if uid else None
        return {"current_user": user}

    # Create tables, run column migrations, and seed default data on first run
    with app.app_context():
        db.create_all()
        _migrate_transactions(db)
        seed_db()

    return app


app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=os.environ.get("FLASK_DEBUG") == "1")
