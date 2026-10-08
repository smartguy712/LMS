# Roll Call LMS — Offline Classroom LMS

A lightweight Flask + SQLite app for classrooms without reliable internet.
Run it on a teacher's laptop or phone, turn on a hotspot, and students connect
over the local network — no cloud services required.

## Features

- **Login system** with hashed passwords and two roles: teacher and student
- **Share notes**: teachers upload files (PDF, Office docs, images, text)
- **Build assessments**: multiple-choice quizzes with an "add question" builder
- **Take quizzes**: students answer online, auto-graded on submit
- **Printable reports**: clean, print-friendly score report per submission
- **Teacher report view**: see every student's submissions in one table

## 1. Setup

```bash
cd lms_project
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## 2. Run it

```bash
python app.py
```

On first run this creates `lms.db` and seeds two demo accounts plus one
sample quiz:

- `teacher / teacher123`
- `student / student123`

**Change or remove these before using the app for real** — open `app.py`,
find `init_db(seed=True)` in the `__main__` block, and either delete the
demo accounts from the database or change their passwords after first login.

The console prints the address to share, e.g.:

```
Students should connect to: http://192.168.1.42:5000
```

## 3. Get students connected

1. Turn on the host device's mobile hotspot (or use a small travel router).
2. Make sure the teacher's laptop/phone is connected to that same hotspot/network.
3. Run `python app.py` — it prints the local IP address to share.
4. Students open that address in any phone or laptop browser on the same network.

If the printed IP doesn't work, run `ipconfig` (Windows) or `ifconfig` /
`ip addr` (Mac/Linux) on the host device to find its LAN IP manually.

## 4. Project layout

```
lms_project/
├── app.py                  # All routes + database logic
├── requirements.txt
├── lms.db                  # Created automatically on first run
├── static/
│   ├── css/style.css       # All styling (no external CDN dependencies)
│   └── notes/              # Uploaded files land here
└── templates/              # Jinja2 HTML templates
```

## 5. Notes on security & scope

This is built for a trusted classroom LAN, not the public internet:

- Change `app.config["SECRET_KEY"]` in `app.py` to a random value before
  real use.
- Passwords are hashed with Werkzeug's `generate_password_hash` (safe default).
- There's no rate-limiting or HTTPS — fine on a private hotspot, not fine
  if you expose this to the open internet.
- Uploaded file types are restricted to common document/image formats; the
  size cap is 25MB per file (adjust `MAX_CONTENT_LENGTH` in `app.py`).

## 6. Common tweaks

- **Change the port**: edit `app.run(host="0.0.0.0", port=5000, ...)` in `app.py`.
- **Reset the database**: stop the app, delete `lms.db`, restart — it will
  be recreated and reseeded.
- **Disable demo seeding**: change `init_db(seed=True)` to `init_db(seed=False)`.
