# ProudGeonZer0Quizv.1

An offline-first fantasy quiz game built with plain HTML, CSS, and JavaScript. No runtime dependencies, external fonts, analytics, or network APIs. The flow is: animated loading intro → **welcome screen** → **player card** (new players) or **quest hub** (returning players).

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
- **Welcome screen** (new): a CSS-only night landscape with stars, moon, aurora, layered ridges, a beacon and drifting motes, plus the ProudGeon crest, the “THE MIND IS LIMITLESS” tagline, a one-line description and a single primary action, **START YOUR ADVENTURE**. Entrance animations run once (about 0.6s, staggered) and are disabled under reduced motion.
- Welcome routing: with no saved profile the primary action opens the existing **Create Your Player Card** screen; with a saved profile it opens the existing **Quest Hub** directly. The back buttons (player card → welcome, quest hub → player card) keep the original flow intact.
- The Player Card and Quest Hub screens are unchanged: name, avatar, quest style, topics, warm-up challenge, quest of the day, fun facts, badges, XP/coins and the “START QUIZ” placeholder dialog all still work, and the saved profile in `localStorage` is read, never reset.
- One shared sound preference drives the loading, welcome and quest hub speakers; the fullscreen button exists on every screen.
- Responsive portrait/landscape layouts with no external assets.
- Service worker caching for offline revisits after the first successful visit on HTTPS or localhost. Direct file use works without a service worker. Clearing browser site data removes the offline cache.

The percentage represents the local intro sequence, not a network download. Update the cache version in `sw.js` when changing cached assets for a deployment.

## Tests

```sh
npm ci
npm test
```

38 Playwright tests across three spec files cover five viewport sizes (1440×900, 393×851, 360×640, 320×568, 851×393), 100% loading completion and replacement, overflow, runtime errors, external-request absence, offline reload, reduced motion, keyboard operation, animation and replay behavior, offline launch links with query strings, and fullscreen rejection/unsupported fallbacks.

`tests/welcome.spec.js` adds the welcome screen contract: exact tagline/description copy, one primary action and no duplicated feature controls, new-player → player card routing, returning-player → quest hub routing with XP/coins/badges intact, legacy saves without the completion flag, double-tap protection, back navigation, viewport fitting with a ≥44px touch target, focus ring, reduced motion, orientation change and no layout shift.

`tests/game.spec.js` protects the restored screens: player card personalization, radio-group arrow keys, quest hub sections, warm-up rewards and the daily quest bonus, fun fact shuffle, the START QUIZ dialog (padding vs backdrop), persistence across reload and the shared sound preference.

Tests use an npm-distributed Linux Chromium browser; set `CHROME_PATH` to use a different installed Chromium executable. Node 22+ and Python 3 are required for the test setup.

Tests emulate mobile viewport sizes in Chromium; real Android hardware testing is still recommended before a production release.
