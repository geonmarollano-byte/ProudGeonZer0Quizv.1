# ProudGeonZer0Quizv.1

An offline-first quiz **loading screen only**, built with plain HTML, CSS, and JavaScript. No runtime dependencies, external fonts, analytics, or network APIs.

The loading screen is the entire application. It is the only interface in the
project: there is no menu, hub, quiz, results, profile, or settings screen, and
loading never redirects anywhere else.

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

The percentage represents the local intro sequence, not a network download. Update the cache version in `sw.js` when changing cached assets for a deployment (`proudgeon-loading-v14`).

## Removed screens

The Welcome/Main Menu, Player Profile, Avatar Selection, Difficulty and Topic
selection, Quest Hub, Warm-Up Challenge, Daily Quest, quiz gameplay, Results,
Achievements, Leaderboard, Settings and dashboard interfaces — plus the old
“Continue” placeholder dialog and its Replay Intro control — are not part of
this project.

The loading screen runs 1–100%, then the progress bar is replaced by a single
**CONTINUE** button. Nothing else appears until the player presses it.

## Upgrade 2 — Welcome screen and login panels

`loading → CONTINUE → WELCOME BACK PLAYER → (admin panel | player info panel)`

**Welcome screen** — `WELCOME BACK PLAYER`, the subtitle "Welcome to your
gaming experience.", and exactly three controls: `LOGIN AS AN ADMIN`,
`JOIN AS A PLAYER` and `< BACK`. BACK returns to the existing loading screen
(still on CONTINUE); it does not create a second loading screen.

**Admin Login panel** — a modal over the Welcome screen with `ADMIN LOGIN`,
"Enter your administrator credentials to continue.", Username and Password
(placeholder text, masked input, show/hide icon), `VERIFY ADMIN LOGIN` and
`BACK TO WELCOME SCREEN`.

- Wrong username, wrong password or empty fields → the panel stays open and
  shows exactly: *"Please enter your correct password or username before you
  can access."*
- Correct credentials → the panel stays open and shows exactly:
  *"Your password is correct!"* The Home screen does not exist yet; wiring this
  success to a Home screen is Upgrade 3.
- Repeated submits are ignored while a check is running; closing the panel
  during a check discards the in-flight result.

**Join as a Player panel** — an information panel only: title
`UNDER CONSTRUCTION`, the message "Under Contraction Please wait a little
longer..." and a `CLOSE` button that returns to the Welcome screen. There is no
player registration, player login or profile of any kind.

## Admin authentication

The administrator username and password are **not** stored in this repository.
`auth-config.js` holds only a one-way PBKDF2-SHA256 verifier of the pair
(salt + 210,000 iterations + `username \0 password`); the browser derives the
same verifier from what is typed and compares it in constant time. Nothing is
written to `localStorage` or `sessionStorage`.

> **Limitation — read this.** GitHub Pages serves static files, so this check
> runs entirely in the browser. It stops casual or accidental access, but it is
> not server-grade authentication: anyone who can read the page can also modify
> or bypass it, or attack the verifier offline. Do not protect sensitive data
> with it. When a backend exists, replace `auth-config.js` with an endpoint call
> (`POST {username, password}` → `200 {authenticated:true}` / `401`, HttpOnly
> session cookie) and delete the client-side verifier.

To change the credentials, follow the recipe in the comment block at the top of
`auth-config.js`.

## Tests

```sh
npm ci
npm test
```

Eighteen Playwright tests cover eight viewport sizes (1440×900, 1280×800, 800×600, 393×851, 360×640, 320×568, 320×480, 851×393), 100% completion with no screen change, absence of any other panel or dialog, overflow, runtime errors, external-request absence, offline reload, reduced motion, animation behavior, fullscreen rejection/unsupported fallbacks, sound preferences, and Web Audio unavailability. Tests use an npm-distributed Linux Chromium browser; set `CHROME_PATH` to use a different installed Chromium executable. Node 22+ and Python 3 are required for the test setup.

Tests emulate mobile viewport sizes in Chromium; real Android hardware testing is still recommended before a production release.
