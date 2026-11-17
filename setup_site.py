"""Create local secrets; never commit the generated instance directory."""

import getpass
import json
import os
import secrets
from pathlib import Path

from werkzeug.security import generate_password_hash

root = Path(__file__).resolve().parent
directory = root / "instance"
directory.mkdir(mode=0o700, exist_ok=True)
target = directory / "settings.json"
if target.exists():
    raise SystemExit("Settings already exist; not overwriting your secrets.")
password = os.environ.get("SITE_PASSWORD") or getpass.getpass("Site password: ")
if len(password) < 8:
    raise SystemExit("Please choose a password of at least eight characters.")
settings = {"SECRET_KEY": secrets.token_hex(32), "PASSWORD_HASH": generate_password_hash(password)}
with target.open("x") as output:
    os.chmod(target, 0o600)
    json.dump(settings, output)
print("Private settings created. Start with: .venv/bin/python server.py")
