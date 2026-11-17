"""Authentication, privacy and input-validation regression tests."""

import unittest
import tomllib
from pathlib import Path
from unittest.mock import patch

from werkzeug.security import generate_password_hash

from server import create_app


class PrivacyTests(unittest.TestCase):
    def setUp(self) -> None:
        self.app = create_app({"SECRET_KEY": "test-only-secret", "PASSWORD_HASH": generate_password_hash("test-password")})
        self.app.config["TESTING"] = True
        self.client = self.app.test_client()

    def csrf(self) -> str:
        return self.client.get("/api/session").json["csrf"]

    def login(self, password: str = "test-password"):
        return self.client.post("/api/login", json={"password": password}, headers={"X-CSRF-Token": self.csrf()})

    def test_login_page_contains_no_private_content(self) -> None:
        response = self.client.get("/")
        self.addCleanup(response.close)
        self.assertEqual(response.status_code, 200)
        for private in [b"Jason", b"Yan", b"test-password", b"2026-05-18"]:
            self.assertNotIn(private, response.data)

    def test_private_routes_require_authentication(self) -> None:
        self.assertEqual(self.client.get("/api/content").status_code, 401)
        for path in ["/photos/yan.jpg", "/photos/jason.jpg", "/photos/scrapbook/7.2.webp", "/photos/scrapbook/1-thumb.webp", "/assets/app.js", "/assets/style.css", "/assets/games.js", "/assets/scrapbook.js", "/assets/music.js"]:
            self.assertEqual(self.client.get(path).status_code, 302)

    def test_public_login_assets(self) -> None:
        for path in ["/login.css", "/login.js"]:
            with self.client.get(path) as response:
                self.assertEqual(response.status_code, 200)

    def test_csrf_required(self) -> None:
        self.assertEqual(self.client.post("/api/login", json={"password": "test-password"}).status_code, 403)

    def test_password_and_session(self) -> None:
        self.assertEqual(self.login("wrong").status_code, 401)
        response = self.login()
        self.assertEqual(response.status_code, 200)
        self.assertIn("HttpOnly", response.headers["Set-Cookie"])
        self.assertIn("SameSite=Strict", response.headers["Set-Cookie"])
        content = self.client.get("/api/content")
        self.assertEqual(content.json["names"], {"him": "Jason", "her": "Yan"})
        self.assertEqual(len(content.json["memories"]), 7)
        with self.client.get("/photos/yan.jpg") as photo:
            self.assertEqual(photo.status_code, 200)

    def test_logout_relocks_private_content(self) -> None:
        login = self.login()
        response = self.client.post("/api/logout", headers={"X-CSRF-Token": login.json["csrf"]})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.client.get("/api/content").status_code, 401)

    def test_edited_burmese_content(self) -> None:
        self.login()
        content = self.client.get("/api/content").json
        self.assertEqual(len(content["letter"]), 4)
        self.assertIn("ရေဘူး", content["memories"][5]["text"])
        self.assertIn("အသည်းပုံ", content["memories"][6]["text"])
        self.assertIn("အခိုက်အတန့်", content["memories"][6]["text"])
        self.assertIn("အနှောင့်အယှက်", content["letter"][2])
        self.assertIn("ဂရုစိုက်", content["letter"][3])

    def test_scrapbook_images_and_captions(self) -> None:
        self.login()
        pages = self.client.get("/api/content").json["scrapbook"]
        self.assertEqual(len(pages), 16)
        self.assertEqual(sum(len(page["images"]) for page in pages), 18)
        self.assertEqual(len({page["id"] for page in pages}), 16)
        image_ids = {image for page in pages for image in page["images"]}
        self.assertEqual(image_ids, {"1", "2", "3", "4", "5", "6", "7.1", "7.2", "8", "9", "10", "11", "12", "13.1", "13.2", "14", "15", "16"})
        for image_id in image_ids:
            for suffix in ["", "-thumb"]:
                path = Path(__file__).parent / "private" / "photos" / "scrapbook" / f"{image_id}{suffix}.webp"
                self.assertTrue(path.is_file(), str(path))
        with self.client.get("/photos/scrapbook/7.2.webp") as response:
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.mimetype, "image/webp")
            self.assertIn("no-store", response.headers["Cache-Control"])
        sixteenth = next(page for page in pages if page["id"] == "every-sixteenth")
        self.assertIn("၁၆", sixteenth["text"])
        self.assertEqual(sixteenth["images"], ["7.1", "7.2"])

    def test_trust_memory_describes_rejection_not_our_conversation(self) -> None:
        self.login()
        pages = self.client.get("/api/content").json["scrapbook"]
        memory = next(page for page in pages if page["id"] == "trust-you")
        self.assertEqual(memory["images"], ["15"])
        self.assertIn("တခြားကောင်လေးတစ်ယောက်", memory["text"])
        self.assertIn("ငြင်းပြီး", memory["text"])
        self.assertNotIn("sleepyhead", memory["title"])

    def test_rate_limit(self) -> None:
        for _ in range(8):
            self.assertEqual(self.login("wrong").status_code, 401)
        self.assertEqual(self.login().status_code, 429)

    def test_invalid_password_type(self) -> None:
        response = self.client.post("/api/login", json={"password": []}, headers={"X-CSRF-Token": self.csrf()})
        self.assertEqual(response.status_code, 401)

    def test_invalid_login_body(self) -> None:
        response = self.client.post("/api/login", json=["not-an-object"], headers={"X-CSRF-Token": self.csrf()})
        self.assertEqual(response.status_code, 400)

    def test_fonts_are_public_but_private_files_are_not(self) -> None:
        with self.client.get("/fonts/myanmar.ttf") as response:
            self.assertEqual(response.status_code, 200)
        with self.client.get("/fonts/emoji.woff2") as response:
            self.assertEqual(response.status_code, 200)
        self.assertEqual(self.client.get("/fonts/../../private/content.json").status_code, 404)

    def test_cannot_fetch_secrets_or_content_file(self) -> None:
        self.login()
        for path in ["/instance/settings.json", "/private/content.json", "/server.py", "/photos/../content.json", "/assets/../server.py"]:
            self.assertEqual(self.client.get(path).status_code, 404)

    def test_security_headers(self) -> None:
        response = self.client.get("/")
        self.addCleanup(response.close)
        self.assertIn("no-store", response.headers["Cache-Control"])
        self.assertEqual(response.headers["X-Frame-Options"], "DENY")
        self.assertIn("frame-ancestors 'none'", response.headers["Content-Security-Policy"])

    def test_vercel_requires_environment_secrets(self) -> None:
        with patch.dict("os.environ", {"VERCEL": "1"}, clear=True):
            with self.assertRaisesRegex(RuntimeError, "SITE_SECRET_KEY"):
                create_app()

    def test_vercel_dependencies_are_declared_in_pyproject(self) -> None:
        root = Path(__file__).parent
        manifest = tomllib.loads((root / "pyproject.toml").read_text())
        dependencies = manifest["project"]["dependencies"]
        requirements = [line.strip() for line in (root / "requirements.txt").read_text().splitlines() if line.strip() and not line.startswith("#")]
        self.assertEqual(sorted(dependencies), sorted(requirements))
        self.assertIn("Flask==3.1.2", dependencies)

    def test_vercel_authentication_and_photos(self) -> None:
        environment = {
            "VERCEL": "1",
            "SITE_SECRET_KEY": "test-vercel-secret",
            "SITE_PASSWORD_HASH": generate_password_hash("test-password"),
        }
        with patch.dict("os.environ", environment, clear=True):
            app = create_app()
        self.assertTrue(app.config["SESSION_COOKIE_SECURE"])
        client = app.test_client()
        csrf = client.get("/api/session", base_url="https://example.test").json["csrf"]
        response = client.post("/api/login", base_url="https://example.test", json={"password": "test-password"}, headers={"X-CSRF-Token": csrf})
        self.assertEqual(response.status_code, 200)
        self.assertIn("Secure;", response.headers["Set-Cookie"])
        self.assertEqual(len(client.get("/api/content", base_url="https://example.test").json["scrapbook"]), 16)
        with client.get("/photos/scrapbook/16.webp", base_url="https://example.test") as photo:
            self.assertEqual(photo.status_code, 200)


if __name__ == "__main__":
    unittest.main()
