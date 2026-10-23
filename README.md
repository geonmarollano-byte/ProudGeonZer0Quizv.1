# ProudGeonZer0Quizv.1

An offline-first quiz game with two screens — **Welcome** (player card setup) and **Home** (quest hub) — built with plain HTML, CSS, and JavaScript. No runtime dependencies, external fonts, analytics, or network APIs.

## Run

Open `index.html` directly for local-file use, or serve this directory:

```sh
npm start
# http://localhost:3000 — requires Python 3
```

The pages fill the available viewport, including Android safe areas. Use the fullscreen buttons for immersive fullscreen; browsers require a user gesture and may disallow it in embedded previews.

## Screens

The former intro/loading screen has been removed. The game now launches directly into the player card (new players) or the quest hub (returning players).

### 1 · Welcome screen — player card setup

This screen is dedicated to creating the player:

- Warm bilingual greeting — “Kumusta, [name]!” — that updates live as you type, with a rotating motivational line, animated avatar stage, and a confetti welcome burst.
- **Create Your Player Card:** hero name (18 characters), 6 avatars with labels (Fox, Panda, Owl, Dragon, Rocket, Tiger), 3 quest styles (🌿 Chill Explorer, ⚡ Brave Challenger, 🔥 Legendary Mastermind), and favorite topics (General, Science, Math, History, Tech, Sports, Pop Culture, Philippines).
- A live summary bar at the bottom and a **PROCEED** button pinned to the screen edge.

### 2 · Home screen — quest hub

PROCEED takes the player to a separate Home Screen that holds the hub details:

- Personalized header — avatar with level badge, “Kumusta ulit, [name]!”, quest style, and XP progress.
- **Warm-Up Challenge:** a real mini-quiz with encouraging feedback. Correct answers earn **+10 XP** and **+5 coins**; wrong answers can be retried without penalty. New questions avoid repeats until every warm-up has been solved.
- **Quest of the Day:** solve 5 warm-up questions to complete the quest and earn a **+50 coin** bonus, tracked with progress dots.
- **Your Favorite Topics:** a read-only view of the topics chosen at welcome, plus **EDIT PLAYER CARD** to jump back to the setup screen.
- **Your Badges:** First Steps (1 warm-up), Brain Spark (3 warm-ups), and Quest Master (daily quest complete) unlock as you play.
- **Did You Know?** rotating fun facts with a shuffle button, plus a short “How to Play” guide.
- Tiny Web Audio sound effects (correct/wrong/click) with a mute toggle — no audio files needed.
- **START QUIZ** is pinned at the bottom and opens a confirmation dialog recapping the player's name, style, topics, XP, and coins.

Player card, XP, coins, badges, sound preference, and solved warm-ups are saved in `localStorage`, so returning players are greeted by name. Clearing browser site data resets progress. Both screens support reduced-motion preferences, keyboard access (including arrow keys in the quest-style radio group), progress semantics, and completion announcements. Responsive portrait/landscape layouts scroll internally on small screens so the primary action stays visible, with no external assets. A service worker caches the app for offline revisits after the first successful visit on HTTPS or localhost; direct file use works without one. Update the cache version in `sw.js` when changing cached assets for a deployment.

## Tests

```sh
npm ci
npm test
```

Playwright tests cover five viewport sizes (1440×900, 393×851, 360×640, 320×568, 851×393), launch routing (new players → player card, saved profiles → quest hub, legacy saves preserved), absence of the removed intro screen, the Player Card → Proceed → Home → Start Quiz flow, player-card personalization (name, avatar, quest style, topics), warm-up correct/wrong answers and rewards, the five-question daily quest with badge unlocks, fun-fact shuffling, edit-player-card navigation, saved progress after reload, internal scrolling with the primary action pinned, overflow, runtime errors, external-request absence, offline reload, reduced motion, keyboard operation, dialog backdrop behavior, offline launch links with query strings, and fullscreen rejection/unsupported fallbacks. Tests use an npm-distributed Linux Chromium browser; set `CHROME_PATH` to use a different installed Chromium executable. Node 22+ and Python 3 are required for the test setup.

Tests emulate mobile viewport sizes in Chromium; real Android hardware testing is still recommended before a production release.
