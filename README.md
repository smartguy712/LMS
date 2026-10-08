# Siyafundza LMS

Flask REST API + React (CDN) single-page frontend, SQLite storage.

## Roles
- **Students** register themselves on the Register page.
- **Teachers** can only be created by the default admin (Users page → *Add Teacher*).
- The default admin is created on first start from `ADMIN_USERNAME` / `ADMIN_PASSWORD`.

## Run locally
```bash
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
ADMIN_PASSWORD=choose-a-password python app.py     # Windows (cmd): set ADMIN_PASSWORD=... && python app.py
```
Open http://127.0.0.1:5000 and sign in as `admin` with that password.
If `ADMIN_PASSWORD` is omitted locally, a random one is printed in the console on first run.

## Deploy to Render
1. Push this folder to a GitHub repository.
2. In Render: **New → Blueprint**, select the repo (it reads `render.yaml`).
3. When prompted, enter a strong value for `ADMIN_PASSWORD`. `SECRET_KEY` is generated automatically.
4. After deploy, sign in as `admin`, then add teachers from the **Users** page.

### Persistence
SQLite and uploaded files are stored on a Render persistent disk mounted at `/var/data`
(`LMS_DB`, `UPLOAD_FOLDER`). Disks need a paid plan. On a free plan, remove the `disk:` block —
the app works, but data resets on every deploy/restart.

## Environment variables
| Variable | Purpose |
|---|---|
| `SECRET_KEY` | Session signing key (required in production) |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` / `ADMIN_EMAIL` / `ADMIN_FULL_NAME` | Default admin, created if no admin exists |
| `LMS_DB` | SQLite path |
| `UPLOAD_FOLDER` | Uploaded files path |
| `CORS_ORIGINS` | Optional comma-separated origins (only if frontend hosted elsewhere) |
