"""Export local secrets for Vercel without printing or committing their values."""

import json
import os
from pathlib import Path


def main() -> None:
    root = Path(__file__).resolve().parent
    directory = root / "instance"
    source = directory / "settings.json"
    if not source.exists():
        raise SystemExit("Run setup_site.py first to create your local secrets.")
    target = directory / "vercel.env"
    if target.exists():
        raise SystemExit("instance/vercel.env already exists; not overwriting it.")
    settings = json.loads(source.read_text())
    values = {
        "SITE_SECRET_KEY": settings["SECRET_KEY"],
        "SITE_PASSWORD_HASH": settings["PASSWORD_HASH"],
    }
    # Single quotes keep the dollar signs in a scrypt hash literal in dotenv files.
    with target.open("x") as output:
        os.chmod(target, 0o600)
        for name, value in values.items():
            if "'" in value or "\n" in value:
                raise ValueError("Unexpected secret format; export values manually.")
            output.write(f"{name}='{value}'\n")
    print("Created instance/vercel.env (private, Git-ignored).")
    print("Import it in Vercel Environment Variables before deploying.")


if __name__ == "__main__":
    main()
