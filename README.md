# ProudGeonZer0Quizv.1

An offline-first quiz **loading screen only**, built with plain HTML, CSS, and JavaScript. No runtime dependencies, external fonts, analytics, or network APIs.

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
- Replay Intro button to watch the 1–100% sequence again after completion.
- Small uppercase motivational quote with a navy/gold visual theme.
- Frame-driven 1–100% intro (about 3.6 seconds) that sweeps continuously instead of stepping, replaced by Continue.
- Reduced-motion preference support (shortened intro).
- Keyboard-accessible controls, progress semantics, and completion announcement.
- Synthesized intro sound (Web Audio, no audio files): a rising ambient pad, soft progress ticks and a completion chime. Browsers require a first tap or keypress, so the page shows “TAP ANYWHERE TO ENABLE SOUND” until audio is unlocked. The speaker button mutes/unmutes and the choice is remembered.
- Continue opens a dismissible placeholder; gameplay is intentionally not implemented.
- The former Welcome and Quest Hub screens have been removed for now, so the game is back to this loading screen only. Player data already saved in `localStorage` is left untouched.
- Responsive portrait/landscape layouts with no external assets.
- Service worker caching for offline revisits after the first successful visit on HTTPS or localhost. Direct file use works without a service worker. Clearing browser site data removes the offline cache.

The percentage represents the local intro sequence, not a network download. Update the cache version in `sw.js` when changing cached assets for a deployment.

## Tests

```sh
npm ci
npm test
```

Twelve Playwright tests cover five viewport sizes (1440×900, 393×851, 360×640, 320×568, 851×393), 100% completion and replacement, Continue dialog, overflow, runtime errors, external-request absence, offline reload, reduced motion, keyboard operation, animation and replay behavior, dialog backdrop behavior, offline launch links with query strings, and fullscreen rejection/unsupported fallbacks. Tests use an npm-distributed Linux Chromium browser; set `CHROME_PATH` to use a different installed Chromium executable. Node 22+ and Python 3 are required for the test setup.

Tests emulate mobile viewport sizes in Chromium; real Android hardware testing is still recommended before a production release.
