# Jason & Yan — Six Months of Us

A private, bilingual, mobile-first monthaversary gift. Original scrapbook design with 18 real photos across 16 illustrated-paper pages, seven additional written memories, three sequential games, a live relationship clock, a love letter and an optional visible YouTube player.

## Local preview (Linux / WSL)

```sh
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python setup_site.py
.venv/bin/python server.py
```

Visit **http://localhost:8080**. Settings have already been created in the provided workspace; skip setup if `instance/settings.json` exists. The password is stored only as a salted hash, never in the browser code. Never share or commit `instance/` or secret environment files.

**Repository visibility:** Photos, chat screenshots and captions are intentionally committed in plaintext to the public repository with the owner's approval. The website login does not protect copies available directly from GitHub. Credentials and session secrets are excluded.

The photo files are `private/photos/yan.jpg` and `private/photos/jason.jpg`. They were copied, not moved, from the provided Downloads paths. The pictured people were assigned from the apparent order/context; confirm the names before sharing.

## Edit your gift

- `private/content.json`: dates, English headings, Burmese memories, letter, questions and song.
- `private/scrapbook.json`: the 16 photo stories and their image mappings. The monthly 16th-day tradition is intentionally separate from the relationship start date on 18 May.
- `web/scrapbook.js` and `web/scrapbook.css`: filterable photo scrapbook, paired swipe galleries, full-screen photo viewing and zoom controls.
- `web/music.js`: YouTube player controls, autoplay-blocked fallback and stop/close behavior.
- `web/style.css`: colors, layout and responsive design.
- `web/app.js`: pages, timer, music and memory/letter dialogs.
- `web/games.js`: quiz, heart catcher and flying game.
- Default date boundary: **Myanmar time (UTC+06:30)**. Change both date offsets in the content file if you prefer another timezone.
- All seven supplied memories are retained. Burmese spelling, punctuation and phrasing have been edited for readability while keeping the personal “ကိုကို / baby” voice and the original stories. English headings and short romantic lines are added.
- Game progress is stored locally on each browser, not synced between devices. It is a playful reveal, not a security barrier. The real privacy barrier is server authentication.
- Fresh login attempts to play the original song if the checked “Start our song” option is left enabled. Some mobile browsers block audible autoplay; the visible player and Play button provide a manual fallback. Restoring an existing session does not start music unexpectedly. Pause pauses; the panel Close × and “Continue without music” stop/destroy playback. The small × also dismisses the floating controls. “Our song” can reopen them. The video stays visible while playing; no hidden background audio extraction is used. Embedding and actual playback depend on YouTube availability. Opening the player loads YouTube’s API, even if the phone blocks playback.
- No third-party requests before authentication. Uncheck the music option to enter without contacting YouTube. Noto Sans Myanmar and Noto Color Emoji are bundled locally under their SIL Open Font Licenses in `web/fonts/`.

## Photo preparation

All 18 source JPGs remain untouched in `../6months/`. Optimized full-size WebP images and small lazy-loaded thumbnails live in `private/photos/scrapbook/` (approximately 2.1 MB in total). Full-size images load only when a memory is opened. Image 3 has been rotated upright and its black letterbox bars removed in the derivative only. Full-size media is not cropped by the viewer; chat screenshots can be enlarged and scrolled. Both image pairs (7.1/7.2 and 13.1/13.2) are retained.

To regenerate images, optionally install Pillow in the environment and run `.venv/bin/python prepare_photos.py`. Pillow is a build-time tool only, not needed to serve already-prepared photos. Chat screenshots retain their original contents, including other people’s visible names; keep the site private and consider redaction before sharing more widely.

## Tests

```sh
.venv/bin/python -m unittest -v
```

## Deploy to Vercel

The application is configured for Vercel's Flask/Python support, not a static-site deployment. `app.py` exports the Flask instance; Python 3.12 is selected in `.python-version`. `vercel.json` includes photos, content and web assets in the server function.

1. Import this GitHub repository in Vercel with the repository root as Root Directory. Use the auto-detected Flask preset; do not configure a static Output Directory or a Gunicorn start command.
2. In **Project Settings → Environment Variables**, add **SITE_SECRET_KEY** and **SITE_PASSWORD_HASH** for Production and Preview (and Development if using `vercel dev`).
3. On the original development computer, run `.venv/bin/python export_vercel_env.py` to generate `instance/vercel.env`. The file is local, mode 0600 and Git-ignored. Import it using Vercel's environment-variable importer, or copy each value into its named variable without the surrounding quotes. It preserves the existing login password. Do not paste its contents into GitHub or commit them.
4. Deploy, or redeploy after setting the variables. Vercel enables secure HTTPS-only session cookies automatically. Verify login, a paired photo memory, music controls, and logout on a phone.

The app deliberately refuses to start on Vercel if either secret variable is missing. Do not put secret values in `vercel.json`. Requests to `/api/*` and `/photos/*` continue through Flask authentication. The `public/` directory contains only the generic login page, CSS and JavaScript.

Runtime dependencies are declared in `pyproject.toml` as well as `requirements.txt`; keep the two lists synchronized. A `ModuleNotFoundError: No module named 'flask'` in Vercel Logs means the dependency installation was missing, not that the login password is wrong. Deploy the latest dependency-fix commit and disable use of the existing build cache when manually redeploying an older build. Leave the Install Command override disabled so Vercel can install the declared Python dependencies.

Login attempt throttling is **per function instance**, not a shared global limit on Vercel. Configure an additional Vercel Firewall rate-limit rule for `/api/login` if needed. No database or writable runtime filesystem is required; the bundled photos and JSON are read-only.

To roll back, promote a previous successful Vercel deployment. Keep the same environment variables unless you intentionally rotate credentials; rotating SITE_SECRET_KEY invalidates existing sessions.

## Other Python hosts

**Do not upload this directory to a static hosting service.** That bypasses the Python authentication layer and could expose personal files. Use a Python-capable host with persistent private files and HTTPS.

Production application command:

```sh
HTTPS_ONLY=1 .venv/bin/gunicorn --workers 1 --threads 4 --bind 127.0.0.1:8080 'server:create_app()'
```

Put it behind a trusted HTTPS reverse proxy. Publish only the application through that proxy, not a separate static directory. Do not use the development server for a public launch. Supply the private `instance/settings.json`, photos and content securely. Keep one worker because login throttling is in-memory; use a shared rate limiter for multi-worker deployment. Restart clears the five-minute throttle. Configure additional reverse-proxy throttling for an internet-facing launch. Behind a proxy, the app rate limit groups users by proxy IP by default; do not trust forwarded IP headers without correctly configuring the trusted proxy topology.

The authenticated cookie is signed, HttpOnly, SameSite=Strict and expires after 12 hours. In production `HTTPS_ONLY=1` enables Secure cookies and HSTS. Responses are no-store and search-engine indexing is discouraged. This is sensible protection for a personal gift, not DRM: someone who knows the password can still save screenshots or photos. Shared-password sessions have no individual user accounts or server-side revocation list; rotating the secret key revokes all sessions.

The configured date boundary remains Myanmar time. Deploying to Vercel and choosing the public hostname is handled in the user's Vercel account; pushing the repository does not itself create a Vercel project.
