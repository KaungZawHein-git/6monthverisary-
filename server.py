"""Private monthaversary site. Run setup_site.py before the first launch."""

import json
import os
import secrets
import threading
import time
from datetime import timedelta
from pathlib import Path

from flask import Flask, abort, jsonify, redirect, request, send_from_directory, session
from werkzeug.security import check_password_hash

ROOT = Path(__file__).resolve().parent


def create_app(test_config: dict | None = None) -> Flask:
    app = Flask(__name__, static_folder=None)
    is_vercel = os.environ.get("VERCEL") == "1"
    if test_config is None:
        secret_key = os.environ.get("SITE_SECRET_KEY")
        password_hash = os.environ.get("SITE_PASSWORD_HASH")
        if secret_key or password_hash or is_vercel:
            if not secret_key or not password_hash:
                raise RuntimeError("Set both SITE_SECRET_KEY and SITE_PASSWORD_HASH in Vercel Environment Variables.")
            settings = {"SECRET_KEY": secret_key, "PASSWORD_HASH": password_hash}
        else:
            config_path = ROOT / "instance" / "settings.json"
            if not config_path.exists():
                raise RuntimeError("Run .venv/bin/python setup_site.py first.")
            settings = json.loads(config_path.read_text())
    else:
        settings = test_config
    app.config.update(
        SECRET_KEY=settings["SECRET_KEY"],
        PASSWORD_HASH=settings["PASSWORD_HASH"],
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE="Strict",
        SESSION_COOKIE_SECURE=is_vercel or os.environ.get("HTTPS_ONLY", "0") == "1",
        PERMANENT_SESSION_LIFETIME=timedelta(hours=12),
        MAX_CONTENT_LENGTH=4096,
    )
    attempts: dict[str, list[float]] = {}
    lock = threading.Lock()

    @app.before_request
    def guard():
        if request.method == "POST":
            token = request.headers.get("X-CSRF-Token", "")
            if not token or not secrets.compare_digest(token, session.get("csrf", "")):
                abort(403)
        public = request.path in {"/", "/api/login", "/api/session", "/login.css", "/login.js"}
        if not public and not request.path.startswith("/fonts/"):
            if not session.get("authenticated"):
                if request.path.startswith("/api/"):
                    return jsonify(error="Please unlock our little world first."), 401
                return redirect("/")

    @app.after_request
    def security_headers(response):
        response.headers["Cache-Control"] = "no-store, private"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        # YouTube requires an origin Referer for embedded playback (error 153).
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["X-Robots-Tag"] = "noindex, nofollow, noarchive"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; script-src 'self' https://www.youtube.com https://s.ytimg.com; style-src 'self'; "
            "img-src 'self' data:; frame-src https://www.youtube-nocookie.com; "
            "connect-src 'self'; object-src 'none'; base-uri 'none'; "
            "form-action 'self'; frame-ancestors 'none'"
        )
        if app.config["SESSION_COOKIE_SECURE"]:
            response.headers["Strict-Transport-Security"] = "max-age=31536000"
        return response

    @app.get("/")
    def index():
        return send_from_directory(ROOT / "public", "index.html")

    # Login assets contain no private content.
    @app.get("/api/session")
    def session_info():
        if "csrf" not in session:
            session["csrf"] = secrets.token_urlsafe(32)
        return jsonify(authenticated=bool(session.get("authenticated")), csrf=session["csrf"])

    @app.post("/api/login")
    def login():
        ip = request.remote_addr or "unknown"
        now = time.monotonic()
        with lock:
            for key in list(attempts):
                attempts[key] = [stamp for stamp in attempts[key] if now - stamp < 300]
                if not attempts[key]:
                    del attempts[key]
            history = attempts.setdefault(ip, [])
            if len(history) >= 8:
                return jsonify(error="Too many tries. Please wait five minutes."), 429
            history.append(now)
        body = request.get_json(silent=True) or {}
        if not isinstance(body, dict):
            return jsonify(error="Please enter a password."), 400
        password = body.get("password", "")
        if not isinstance(password, str) or len(password) > 256 or not check_password_hash(
            app.config["PASSWORD_HASH"], password
        ):
            return jsonify(error="Not quite, baby. Try our secret password again. ♡"), 401
        with lock:
            attempts.pop(ip, None)
        session.clear()
        session.permanent = True
        session["authenticated"] = True
        session["csrf"] = secrets.token_urlsafe(32)
        return jsonify(csrf=session["csrf"])

    @app.post("/api/logout")
    def logout():
        session.clear()
        return jsonify(ok=True)

    @app.get("/login.css")
    def login_css():
        return send_from_directory(ROOT / "public", "login.css")

    @app.get("/login.js")
    def login_js():
        return send_from_directory(ROOT / "public", "login.js")

    @app.get("/assets/<path:name>")
    def assets(name: str):
        return send_from_directory(ROOT / "web", name)

    @app.get("/fonts/<path:name>")
    def fonts(name: str):
        return send_from_directory(ROOT / "web" / "fonts", name)

    @app.get("/photos/<path:name>")
    def photos(name: str):
        return send_from_directory(ROOT / "private" / "photos", name)

    @app.get("/api/content")
    def content():
        content = json.loads((ROOT / "private" / "content.json").read_text())
        content["scrapbook"] = json.loads((ROOT / "private" / "scrapbook.json").read_text())
        return jsonify(content)

    return app


if __name__ == "__main__":
    create_app().run(host="127.0.0.1", port=int(os.environ.get("PORT", "8080")), debug=False)
