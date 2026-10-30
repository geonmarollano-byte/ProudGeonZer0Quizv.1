# ProudGeonZer0Quizv.1

Built with plain HTML, CSS, and JavaScript. No runtime dependencies, external fonts, or analytics.

## Screens (Upgrade 1 + Upgrade 2)

The application contains exactly three screens and no others:

1. **Loading screen** (Upgrade 1) — unchanged original artwork, animations, progress bar, sound and fullscreen controls.
2. **Welcome screen** (Upgrade 2) — "WELCOME TO THE NEXT LEVEL.", the subtitle, the ProudGeon Zer0Quiz V.1 branding, VERSION 1.0 / 2026, and one control: **ADMIN LOGIN**.
3. **Admin Login screen** (Upgrade 2) — "ADMIN LOGIN" / "AUTHORIZED ACCESS ONLY", username and password fields, Show/Hide password, **SECURE LOGIN**, and **BACK TO WELCOME**.

Flow: `loading → welcome → admin login → back to welcome`. There is no menu,
quiz, dashboard, profile, results, leaderboard, settings or registration screen,
and no other destination exists.

## Authentication configuration status

**Not configured in this repository — by design.**

This project is a public, static bundle served from GitHub Pages. GitHub Pages
cannot verify passwords, so shipping any credential here would expose it to
anyone. Consequently:

- No username, password, password hash, API key or secret exists anywhere in the
  source, in `localStorage`, or in `sessionStorage`.
- The administrator username `pg-admin` is **not** stored in the bundle; it is
  only entered by the user at login time.
- With no endpoint configured, the Admin Login screen states that secure
  authentication is not configured and refuses to verify anything. It never
  simulates a successful login.
- Nothing is written to `localStorage`/`sessionStorage` for authentication, and
  entered passwords are cleared from the form after every attempt.

### Enabling real sign-in (project owner)

1. Deploy a server-side authentication endpoint (any host you approve — this
   repository intentionally integrates none).
2. Store the admin account server-side with a modern password hash
   (Argon2id, scrypt or bcrypt) — never a plaintext password.
3. Provide the endpoint at `POST` with JSON `{ username, password }`:
   - `200` + `{ "authenticated": true }` on success;
   - `401` + `{ "authenticated": false }` on invalid credentials;
   - set an `HttpOnly`, `Secure`, `SameSite` session cookie on success.
4. Put the endpoint URL in `auth-config.json` → `endpoint`, or inject
   `window.PG_AUTH_CONFIG = { endpoint: "https://…/api/admin/login" }` before
   `app.js` loads.

Only `https://` endpoints, a same-origin path, or `http://localhost` (local
development) are accepted; anything else is ignored and treated as
"not configured". Until step 4 is done, the login screen shows the
not-configured notice.

## Run

Open `index.html` directly for local-file use, or serve this directory:

```sh
npm start
# http://localhost:3000 — requires Python 3
```

The page fills the available viewport, including Android safe areas. Use the top-right fullscreen button for immersive fullscreen; browsers require a user gesture and may disallow it in embedded previews.

## Included

- Original inline SVG emblem and uppercase game title.
- Floating emblem, rotating energy rings, rising particles, and a shimmering progress bar.
- Small uppercase motivational quote with a navy/gold visual theme.
- Frame-driven 1–100% intro (about 3.6 seconds) that sweeps continuously instead of stepping.
- After reaching 100% the screen simply holds; nothing else opens and the page
  does not navigate or swap in another interface.
- Reduced-motion preference support (shortened intro).
- Keyboard-accessible controls, progress semantics, and completion announcement.
- Synthesized intro sound (Web Audio, no audio files): a rising ambient pad, soft progress ticks and a completion chime. Browsers require a first tap or keypress, so the page shows “TAP ANYWHERE TO ENABLE SOUND” until audio is unlocked. The speaker button mutes/unmutes and the choice is remembered.
- Responsive portrait/landscape layouts with no external assets.
- Service worker caching for offline revisits after the first successful visit on HTTPS or localhost. Direct file use works without a service worker. Clearing browser site data removes the offline cache.

The percentage represents the local intro sequence, not a network download. Update the cache version in `sw.js` when changing cached assets for a deployment (`proudgeon-loading-v12`). The worker fetches network-first and falls back to the cache when offline, so a new deployment is picked up on the next page load instead of after two reloads.

## Login behaviour

- Empty fields show a specific inline message and no request is made.
- Invalid credentials show one generic message (`INVALID USERNAME OR PASSWORD.`) that never says which field was wrong and never echoes the password.
- The submit control locks while a check is in flight, so repeated clicks or
  Enter presses cannot queue duplicate attempts.
- Network failures are reported as "service unavailable"; they are never
  reported as success.
- Show/Hide password toggles the input type without losing the typed value and
  updates its accessible label.

## Removed screens

The Welcome/Main Menu, Player Profile, Avatar Selection, Difficulty and Topic
selection, Quest Hub, Warm-Up Challenge, Daily Quest, quiz gameplay, Results,
Achievements, Leaderboard, Settings and dashboard interfaces — plus the old
“Continue” placeholder dialog and its Replay Intro control — are not part of
this project. Player data that may exist in `localStorage` from earlier builds
is left untouched (the app never reads or clears it).

## Tests

```sh
npm ci
npm test
```

Two Playwright suites (`tests/loading.spec.js` for Upgrade 1, `tests/welcome-login.spec.js` for Upgrade 2):

- **Upgrade 1 regression** — loading screen, its animations, progress sweep, sound toggle, fullscreen fallbacks, offline reload and reduced motion at eight viewport sizes, plus the hand-off to the Welcome screen.
- **Upgrade 2** — Welcome branding and its single control, opening/closing the Admin Login screen, Show/Hide password, empty-field validation with no network request, generic invalid-credential error, unconfigured-deployment refusal, unavailable-service handling, rejection of insecure endpoints, duplicate-submit prevention, keyboard focus, no page overflow at eight viewport sizes, and a static scan proving no credential, hash or key is shipped.

Tests use an npm-distributed Linux Chromium browser; set `CHROME_PATH` to use a different installed Chromium executable. Node 22+ and Python 3 are required for the test setup.

Tests emulate mobile viewport sizes in Chromium; real Android hardware testing is still recommended before a production release.
