# DetailDash — Car Wash & Auto Detailing Management System

A production-ready business management platform for car wash and auto detailing shops.

**Modules:** POS / Transactions · Inventory · Customer CRM · Vehicle Registry · Job Orders · Reports · Dashboard

---

## Quick Start (Development)

```bash
cd backend
pip install -r requirements.txt
python app.py
```

Runs on `http://localhost:5000` using SQLite — no database setup needed for development.

---

## Production Deployment (Linux VPS + PostgreSQL)

### 1. System requirements

```bash
sudo apt update && sudo apt install -y python3 python3-pip python3-venv postgresql nginx
```

### 2. PostgreSQL setup

```bash
sudo -u postgres psql
CREATE DATABASE detaildash;
CREATE USER detaildash_user WITH PASSWORD 'strongpassword';
GRANT ALL PRIVILEGES ON DATABASE detaildash TO detaildash_user;
\q
```

### 3. Application setup

```bash
git clone <your-repo> /srv/detaildash
cd /srv/detaildash/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 4. Environment variables

```bash
cp .env.example .env
nano .env   # fill in SECRET_KEY and DATABASE_URL
```

`.env` example:
```
SECRET_KEY=your-strong-secret-key-here
DATABASE_URL=postgresql://detaildash_user:strongpassword@localhost:5432/detaildash
FLASK_ENV=production
FLASK_DEBUG=0
```

Load `.env` before running:
```bash
export $(grep -v '^#' .env | xargs)
```

### 5. Database migrations

```bash
# First time — initialize migration repository
flask --app app db init

# Generate initial migration from models
flask --app app db migrate -m "initial schema"

# Apply to database
flask --app app db upgrade
```

For future schema changes:
```bash
flask --app app db migrate -m "describe your change"
flask --app app db upgrade
```

### 6. Test the application

```bash
gunicorn --config gunicorn.conf.py app:app
```

### 7. systemd service

Create `/etc/systemd/system/detaildash.service`:

```ini
[Unit]
Description=DetailDash Gunicorn Service
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/srv/detaildash/backend
EnvironmentFile=/srv/detaildash/backend/.env
ExecStart=/srv/detaildash/backend/venv/bin/gunicorn --config gunicorn.conf.py app:app
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable detaildash
sudo systemctl start detaildash
sudo systemctl status detaildash
```

### 8. Nginx reverse proxy

Create `/etc/nginx/sites-available/detaildash`:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    client_max_body_size 16M;

    location /static/ {
        alias /srv/detaildash/backend/static/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 30;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/detaildash /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 9. HTTPS with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `SECRET_KEY` | **Yes** | Flask session secret — use a long random string |
| `DATABASE_URL` | Production | PostgreSQL URL. Omit to use SQLite (dev only) |
| `FLASK_ENV` | No | `development` or `production` (default: `development`) |
| `FLASK_DEBUG` | No | Set to `1` for debug mode — **never in production** |
| `APP_URL` | No | Public base URL (for future email/link features) |

Generate a secure `SECRET_KEY`:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

---

## Database Backup (PostgreSQL)

```bash
# Backup
pg_dump -U detaildash_user detaildash > backup_$(date +%Y%m%d).sql

# Restore
psql -U detaildash_user detaildash < backup_20240101.sql
```

Automate daily backups with cron:
```bash
0 2 * * * pg_dump -U detaildash_user detaildash > /backups/detaildash_$(date +\%Y\%m\%d).sql
```

---

## Project Structure

```
backend/
├── app.py              — Application factory (create_app)
├── config.py           — Environment-based configuration
├── db.py               — SQLAlchemy models with indexes
├── gunicorn.conf.py    — Gunicorn production configuration
├── requirements.txt    — Python dependencies
├── .env.example        — Environment variable template
├── routes/
│   ├── __init__.py     — Shared auth decorators (login_required, api_login_required)
│   ├── auth.py         — Login / register / logout blueprint
│   ├── pages.py        — Page routes blueprint (dashboard, POS, inventory, …)
│   └── api.py          — REST API blueprint (/api/*)
├── static/
│   ├── css/            — Stylesheets (theme.css + per-page)
│   └── js/             — Frontend JavaScript
└── templates/          — Jinja2 HTML templates
```

---

## Tech Stack

- **Backend:** Python 3.11, Flask 3, SQLAlchemy, Flask-Migrate (Alembic), Flask-WTF
- **Database:** PostgreSQL (production) / SQLite (development)
- **Server:** Gunicorn + Nginx
- **Frontend:** HTML5, CSS3 (custom design system), JavaScript, Bootstrap 5, Chart.js
