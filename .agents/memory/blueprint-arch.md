---
name: Blueprint architecture
description: How the Flask app is structured with blueprints and the create_app factory
---

## Rule
All routes live in blueprints. The `app.py` is a factory only. `url_for()` calls must include the blueprint name prefix.

## Blueprint map
- `auth` blueprint (routes/auth.py) — /login GET, /login POST, /logout, /register GET/POST
- `pages` blueprint (routes/pages.py) — /index, /transaction, /inventory, /customers, /vehicles, /job-orders, /reports, /account
- `api` blueprint (routes/api.py, url_prefix="/api") — all /api/* endpoints

## url_for references
- Login page → `url_for("auth.login_get")`
- Dashboard → `url_for("pages.index")`
- Static files → `url_for("static", filename="...")` (no prefix needed)

## Shared decorators
- `login_required` and `api_login_required` live in `routes/__init__.py`
- Import them with: `from routes import login_required`

**Why:** Blueprints were added during production modernization to separate concerns. Any new routes must be added to the appropriate blueprint, not directly to app.py.
