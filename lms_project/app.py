"""
Offline Classroom LMS
A lightweight Flask + SQLite app designed to run on a teacher's laptop/phone
and be served to students over a local hotspot (no internet required).
"""

import os
import socket
import sqlite3
from datetime import datetime
from functools import wraps

from flask import (
    Flask, g, render_template, request, redirect,
    url_for, session, flash, send_from_directory, abort
)
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE = os.path.join(BASE_DIR, "lms.db")
UPLOAD_FOLDER = os.path.join(BASE_DIR, "static", "notes")
ALLOWED_EXTENSIONS = {"pdf", "doc", "docx", "ppt", "pptx", "txt", "png", "jpg", "jpeg"}

app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "change-this-secret-key-before-real-use")
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["MAX_CONTENT_LENGTH"] = 25 * 1024 * 1024  # 25 MB upload cap

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

SEED_DEMO_DATA = os.environ.get("SEED_DEMO_DATA", "true").lower() != "false"


# ---------------------------------------------------------------------------
# Database helpers
# ---------------------------------------------------------------------------

def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DATABASE)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db


@app.teardown_appcontext
def close_db(exception=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db(seed=True):
    """Create tables and optionally add demo data. Safe to run multiple times."""
    db = sqlite3.connect(DATABASE)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys = ON")
    db.executescript(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL CHECK (role IN ('teacher', 'student')),
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            file_path TEXT NOT NULL,
            uploaded_by INTEGER NOT NULL,
            upload_date TEXT NOT NULL,
            FOREIGN KEY (uploaded_by) REFERENCES users (id)
        );

        CREATE TABLE IF NOT EXISTS assessments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            created_by INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (created_by) REFERENCES users (id)
        );

        CREATE TABLE IF NOT EXISTS questions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            assessment_id INTEGER NOT NULL,
            text TEXT NOT NULL,
            option_a TEXT NOT NULL,
            option_b TEXT NOT NULL,
            option_c TEXT NOT NULL,
            option_d TEXT NOT NULL,
            correct_option TEXT NOT NULL CHECK (correct_option IN ('a','b','c','d')),
            FOREIGN KEY (assessment_id) REFERENCES assessments (id)
        );

        CREATE TABLE IF NOT EXISTS submissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            assessment_id INTEGER NOT NULL,
            score INTEGER NOT NULL,
            total INTEGER NOT NULL,
            submission_date TEXT NOT NULL,
            FOREIGN KEY (student_id) REFERENCES users (id),
            FOREIGN KEY (assessment_id) REFERENCES assessments (id)
        );
        """
    )
    db.commit()

    if seed:
        existing = db.execute("SELECT COUNT(*) AS c FROM users").fetchone()["c"]
        if existing == 0:
            now = datetime.now().isoformat(timespec="seconds")
            teacher_hash = generate_password_hash("teacher123")
            student_hash = generate_password_hash("student123")

            db.execute(
                "INSERT INTO users (username, password_hash, role, created_at) VALUES (?, ?, ?, ?)",
                ("teacher", teacher_hash, "teacher", now),
            )
            db.execute(
                "INSERT INTO users (username, password_hash, role, created_at) VALUES (?, ?, ?, ?)",
                ("student", student_hash, "student", now),
            )
            db.commit()

            teacher_id = db.execute(
                "SELECT id FROM users WHERE username = 'teacher'"
            ).fetchone()["id"]

            cur = db.execute(
                "INSERT INTO assessments (title, created_by, created_at) VALUES (?, ?, ?)",
                ("Sample Quiz: General Knowledge", teacher_id, now),
            )
            assessment_id = cur.lastrowid

            sample_questions = [
                ("What is the capital of Kenya?", "Nairobi", "Lagos", "Cairo", "Accra", "a"),
                ("2 + 2 * 2 = ?", "6", "8", "4", "2", "a"),
                ("Water boils at what temperature (°C) at sea level?", "100", "90", "50", "212", "a"),
            ]
            for q in sample_questions:
                db.execute(
                    """INSERT INTO questions
                       (assessment_id, text, option_a, option_b, option_c, option_d, correct_option)
                       VALUES (?, ?, ?, ?, ?, ?, ?)""",
                    (assessment_id, *q),
                )
            db.commit()
    db.close()


# Create tables (and seed demo accounts) on import, so this also runs under
# Gunicorn in production, not just when launched via `python app.py`.
# Seeding only happens if the demo accounts don't already exist (see above).
init_db(seed=SEED_DEMO_DATA)


# ---------------------------------------------------------------------------
# Auth helpers
# ---------------------------------------------------------------------------

def login_required(f):
    @wraps(f)
    def wrapped(*args, **kwargs):
        if "user_id" not in session:
            return redirect(url_for("login"))
        return f(*args, **kwargs)
    return wrapped


def teacher_required(f):
    @wraps(f)
    def wrapped(*args, **kwargs):
        if session.get("role") != "teacher":
            abort(403)
        return f(*args, **kwargs)
    return wrapped


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


# ---------------------------------------------------------------------------
# Routes: auth
# ---------------------------------------------------------------------------

@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        username = request.form["username"].strip()
        password = request.form["password"]
        role = request.form.get("role", "student")
        if role not in ("teacher", "student"):
            role = "student"

        if not username or not password:
            flash("Username and password are required.", "error")
            return redirect(url_for("register"))

        if role == "teacher":
            teacher_code = request.form.get("teacher_code", "")
            required_code = os.environ.get("TEACHER_SIGNUP_CODE", "")
            if not required_code or teacher_code != required_code:
                flash("That teacher invite code isn't valid.", "error")
                return redirect(url_for("register"))

        db = get_db()
        existing = db.execute(
            "SELECT id FROM users WHERE username = ?", (username,)
        ).fetchone()
        if existing:
            flash("That username is already taken.", "error")
            return redirect(url_for("register"))

        db.execute(
            "INSERT INTO users (username, password_hash, role, created_at) VALUES (?, ?, ?, ?)",
            (username, generate_password_hash(password), role, datetime.now().isoformat(timespec="seconds")),
        )
        db.commit()
        flash("Account created. Please log in.", "success")
        return redirect(url_for("login"))

    return render_template("register.html")


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form["username"].strip()
        password = request.form["password"]

        db = get_db()
        user = db.execute(
            "SELECT * FROM users WHERE username = ?", (username,)
        ).fetchone()

        if user is None or not check_password_hash(user["password_hash"], password):
            flash("Invalid username or password.", "error")
            return redirect(url_for("login"))

        session["user_id"] = user["id"]
        session["username"] = user["username"]
        session["role"] = user["role"]
        return redirect(url_for("index"))

    return render_template("login.html")


@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))


# ---------------------------------------------------------------------------
# Routes: dashboard
# ---------------------------------------------------------------------------

@app.route("/")
@login_required
def index():
    db = get_db()
    notes = db.execute("SELECT * FROM notes ORDER BY upload_date DESC").fetchall()
    assessments = db.execute("SELECT * FROM assessments ORDER BY created_at DESC").fetchall()

    my_submissions = {}
    if session["role"] == "student":
        rows = db.execute(
            "SELECT id, assessment_id, score, total FROM submissions WHERE student_id = ?",
            (session["user_id"],),
        ).fetchall()
        my_submissions = {r["assessment_id"]: r for r in rows}

    return render_template(
        "dashboard.html",
        notes=notes,
        assessments=assessments,
        my_submissions=my_submissions,
    )


@app.route("/notes/<path:filename>")
@login_required
def download_note(filename):
    return send_from_directory(app.config["UPLOAD_FOLDER"], filename, as_attachment=False)


# ---------------------------------------------------------------------------
# Routes: notes (teacher)
# ---------------------------------------------------------------------------

@app.route("/upload_note", methods=["GET", "POST"])
@login_required
@teacher_required
def upload_note():
    if request.method == "POST":
        title = request.form.get("title", "").strip()
        file = request.files.get("file")

        if not title or not file or file.filename == "":
            flash("Please provide a title and a file.", "error")
            return redirect(url_for("upload_note"))

        if not allowed_file(file.filename):
            flash("That file type isn't supported.", "error")
            return redirect(url_for("upload_note"))

        filename = secure_filename(file.filename)
        # avoid collisions
        stamped = f"{int(datetime.now().timestamp())}_{filename}"
        file.save(os.path.join(app.config["UPLOAD_FOLDER"], stamped))

        db = get_db()
        db.execute(
            "INSERT INTO notes (title, file_path, uploaded_by, upload_date) VALUES (?, ?, ?, ?)",
            (title, stamped, session["user_id"], datetime.now().isoformat(timespec="seconds")),
        )
        db.commit()
        flash("Note uploaded.", "success")
        return redirect(url_for("index"))

    return render_template("upload_note.html")


# ---------------------------------------------------------------------------
# Routes: assessments (teacher creates, student takes)
# ---------------------------------------------------------------------------

@app.route("/create_quiz", methods=["GET", "POST"])
@login_required
@teacher_required
def create_quiz():
    if request.method == "POST":
        title = request.form.get("title", "").strip()
        if not title:
            flash("Give the assessment a title.", "error")
            return redirect(url_for("create_quiz"))

        # Collect parallel arrays of question fields
        texts = request.form.getlist("q_text")
        opts_a = request.form.getlist("q_a")
        opts_b = request.form.getlist("q_b")
        opts_c = request.form.getlist("q_c")
        opts_d = request.form.getlist("q_d")
        corrects = request.form.getlist("q_correct")

        if not texts or any(not t.strip() for t in texts):
            flash("Every question needs text and four options.", "error")
            return redirect(url_for("create_quiz"))

        db = get_db()
        cur = db.execute(
            "INSERT INTO assessments (title, created_by, created_at) VALUES (?, ?, ?)",
            (title, session["user_id"], datetime.now().isoformat(timespec="seconds")),
        )
        assessment_id = cur.lastrowid

        for i in range(len(texts)):
            db.execute(
                """INSERT INTO questions
                   (assessment_id, text, option_a, option_b, option_c, option_d, correct_option)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (
                    assessment_id, texts[i].strip(),
                    opts_a[i].strip(), opts_b[i].strip(),
                    opts_c[i].strip(), opts_d[i].strip(),
                    corrects[i],
                ),
            )
        db.commit()
        flash("Assessment created.", "success")
        return redirect(url_for("index"))

    return render_template("create_quiz.html")


@app.route("/quiz/<int:quiz_id>")
@login_required
def take_quiz(quiz_id):
    db = get_db()
    assessment = db.execute("SELECT * FROM assessments WHERE id = ?", (quiz_id,)).fetchone()
    if assessment is None:
        abort(404)

    # If a student already submitted, show their report instead of re-taking it
    if session["role"] == "student":
        prior = db.execute(
            "SELECT id FROM submissions WHERE student_id = ? AND assessment_id = ?",
            (session["user_id"], quiz_id),
        ).fetchone()
        if prior:
            return redirect(url_for("print_report", submission_id=prior["id"]))

    questions = db.execute(
        "SELECT * FROM questions WHERE assessment_id = ?", (quiz_id,)
    ).fetchall()
    return render_template("take_quiz.html", assessment=assessment, questions=questions)


@app.route("/quiz/<int:quiz_id>/submit", methods=["POST"])
@login_required
def submit_quiz(quiz_id):
    db = get_db()
    questions = db.execute(
        "SELECT * FROM questions WHERE assessment_id = ?", (quiz_id,)
    ).fetchall()

    score = 0
    for q in questions:
        student_answer = request.form.get(f"question_{q['id']}")
        if student_answer == q["correct_option"]:
            score += 1

    total = len(questions)
    cur = db.execute(
        """INSERT INTO submissions (student_id, assessment_id, score, total, submission_date)
           VALUES (?, ?, ?, ?, ?)""",
        (session["user_id"], quiz_id, score, total, datetime.now().isoformat(timespec="seconds")),
    )
    db.commit()
    return redirect(url_for("print_report", submission_id=cur.lastrowid))


@app.route("/report/<int:submission_id>")
@login_required
def print_report(submission_id):
    db = get_db()
    submission = db.execute(
        """SELECT submissions.*, users.username AS student_name, assessments.title AS quiz_title
           FROM submissions
           JOIN users ON users.id = submissions.student_id
           JOIN assessments ON assessments.id = submissions.assessment_id
           WHERE submissions.id = ?""",
        (submission_id,),
    ).fetchone()
    if submission is None:
        abort(404)

    # Students may only view their own report; teachers may view any
    if session["role"] == "student" and submission["student_id"] != session["user_id"]:
        abort(403)

    return render_template("print_report.html", submission=submission)


@app.route("/reports")
@login_required
@teacher_required
def all_reports():
    db = get_db()
    rows = db.execute(
        """SELECT submissions.*, users.username AS student_name, assessments.title AS quiz_title
           FROM submissions
           JOIN users ON users.id = submissions.student_id
           JOIN assessments ON assessments.id = submissions.assessment_id
           ORDER BY submissions.submission_date DESC"""
    ).fetchall()
    return render_template("all_reports.html", rows=rows)


# ---------------------------------------------------------------------------
# Error pages
# ---------------------------------------------------------------------------

@app.errorhandler(403)
def forbidden(e):
    return render_template("error.html", code=403, message="You don't have access to that page."), 403


@app.errorhandler(404)
def not_found(e):
    return render_template("error.html", code=404, message="That page doesn't exist."), 404


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    init_db(seed=True)

    hostname = socket.gethostname()
    try:
        local_ip = socket.gethostbyname(hostname)
    except socket.gaierror:
        local_ip = "127.0.0.1"

    print("=" * 60)
    print(" Offline Classroom LMS is starting up")
    print(f" Teacher/students on the same hotspot should visit:")
    print(f"   http://{local_ip}:5000")
    print(" Demo accounts (change these before real use!):")
    print("   teacher / teacher123")
    print("   student / student123")
    print("=" * 60)

    app.run(host="0.0.0.0", port=5000, debug=False)
