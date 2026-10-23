# ProudGeonZer0Quizv.1

An offline-first quiz game with a loading screen and a full-screen **Welcome Screen**, built with plain HTML, CSS, and JavaScript. No runtime dependencies, external fonts, analytics, or network APIs.

## Run

Open `index.html` directly for local-file use, or serve this directory:

```sh
npm start
# http://localhost:3000 — requires Python 3
```

The pages fill the available viewport, including Android safe areas. Use the fullscreen buttons for immersive fullscreen; browsers require a user gesture and may disallow it in embedded previews.

## Screens

### 1 · Loading screen

- Original inline SVG emblem and uppercase game title.
- Floating emblem, rotating energy rings, rising particles, and a shimmering progress bar.
- Replay Intro button to watch the 1–100% sequence again after completion.
- Small uppercase motivational quote with a navy/gold visual theme.
- Time-based 1–100% intro (about 3.8 seconds), replaced by Continue.
- The percentage represents the local intro sequence, not a network download.

### 2 · Welcome screen

Pressing **CONTINUE** on the loading screen opens the full-screen Welcome Screen:

- Warm bilingual greeting — “Kumusta, Challenger! 👋” — with a rotating motivational line, animated avatar stage, level/XP/coin stats, and a confetti welcome burst.
- **Create Your Player Card:** type a hero name (the greeting updates live), pick from 6 avatars, choose a quest style (🌿 Chill Explorer, ⚡ Brave Challenger, 🔥 Legendary Mastermind), and tap favorite topics (General, Science, Math, History, Tech, Sports, Pop Culture, Philippines).
- **Warm-Up Challenge:** a real mini-quiz with encouraging feedback — correct answers earn **+10 XP** and **+5 coins**, wrong answers can be retried without penalty.
- **Quest of the Day:** solve 5 warm-up questions to complete the quest and earn a **+50 coin** bonus, tracked with progress dots.
- **Did You Know?** rotating fun facts with a shuffle button, plus a short “How to Play” guide.
- Tiny Web Audio sound effects (correct/wrong/click) with a mute toggle — no audio files needed.
- **PROCEED** button pinned at the bottom with a live summary of your player card; it opens a confirmation dialog recapping your name, style, topics, XP, and coins. A Back button returns to the loading screen.
- Your player card, XP, coins, sound preference, and solved warm-ups are saved in `localStorage`, so returning players are greeted by name. Clearing browser site data resets it.

Both screens support reduced-motion preferences, keyboard access, progress semantics, and completion announcements. Responsive portrait/landscape layouts scroll internally on small screens so PROCEED always stays visible, with no external assets. A service worker caches the app for offline revisits after the first successful visit on HTTPS or localhost; direct file use works without one. Update the cache version in `sw.js` when changing cached assets for a deployment.

## Tests

```sh
npm ci
npm test
```

Playwright tests cover five viewport sizes (1440×900, 393×851, 360×640, 320×568, 851×393), loading completion, the Continue → Welcome → Proceed → dialog flow, player-card personalization (name, avatar, difficulty, topics), warm-up correct/wrong answers and rewards, fun-fact shuffling, back navigation, saved-player persistence after reload, internal scrolling with PROCEED pinned, overflow, runtime errors, external-request absence, offline reload, reduced motion, keyboard operation, animation and replay behavior, dialog backdrop behavior, offline launch links with query strings, and fullscreen rejection/unsupported fallbacks. Tests use an npm-distributed Linux Chromium browser; set `CHROME_PATH` to use a different installed Chromium executable. Node 22+ and Python 3 are required for the test setup.

Tests emulate mobile viewport sizes in Chromium; real Android hardware testing is still recommended before a production release.
