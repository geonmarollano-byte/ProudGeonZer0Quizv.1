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
- Small uppercase motivational quote with a navy/gold visual theme.
- Time-based 1–100% intro (about 3.8 seconds), replaced by Continue.
- Reduced-motion preference support (shortened intro).
- Keyboard-accessible controls, progress semantics, and completion announcement.
- Continue opens a dismissible placeholder; gameplay is intentionally not implemented.
- Responsive portrait/landscape layouts with no external assets.
- Service worker caching for offline revisits after the first successful visit on HTTPS or localhost. Direct file use works without a service worker. Clearing browser site data removes the offline cache.

The percentage represents the local intro sequence, not a network download. Update the cache version in `sw.js` when changing cached assets for a deployment.

## Tests

```sh
npm ci
npm test
```

Seven Playwright tests cover five viewport sizes (1440×900, 393×851, 360×640, 320×568, 851×393), 100% completion and replacement, Continue dialog, overflow, runtime errors, external-request absence, offline reload, reduced motion, and keyboard operation. Tests use an npm-distributed Linux Chromium browser; set `CHROME_PATH` to use a different installed Chromium executable. Node 22+ and Python 3 are required for the test setup.

Tests emulate mobile viewport sizes in Chromium; real Android hardware testing is still recommended before a production release.
