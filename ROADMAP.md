# ProudGeonZer0Quiz V.1 — Product & Engineering Roadmap

**Status:** Planning document only — no application code is changed by this file.
**Baseline:** `main` @ `790728c` (Upgrade 1 + Upgrade 2 complete)
**Owner:** Project owner · **Prepared:** 2026

---

## 1. Where the game stands today

| Area | Current reality |
|---|---|
| Stack | Vanilla HTML / CSS / JS. No framework, no bundler, no runtime dependencies |
| Hosting | GitHub Pages, static only (`main` → `/`), HTTPS enforced |
| Files | `index.html` (370) · `style.css` (1,489) · `app.js` (627) · `sw.js` (77) · `auth-config.js` (46) |
| Screens | Loading (`#screen-loading`) → Welcome (`#screen-welcome`) + 2 modal panels |
| Auth | Client-side PBKDF2 verifier for one admin account. **Not server-grade** |
| Persistence | None. Nothing is written to `localStorage`/`sessionStorage` except the sound preference |
| Offline | Service worker, network-first with cache fallback (`proudgeon-loading-v15`) |
| Quality | 36 Playwright tests; manual responsive checks at 7 viewport sizes |
| Accessibility | Keyboard-reachable, `aria-live` status, focus management, reduced-motion support |

### The three hard constraints that shape every decision below

1. **GitHub Pages cannot run server code.** Anything requiring secrets, real accounts, or anti-cheat needs an external backend or a platform change.
2. **The bundle is public.** Every line of JS and CSS is readable by every player. Game logic in the bundle is therefore *descriptive*, not *protective*.
3. **No build step today.** This is a strength (instant deploys, zero supply-chain risk) and a ceiling (no JSX, no module bundling, no type checking).

---

## 2. North star

> **A gold-on-navy quiz game that feels premium on a phone, loads instantly, works offline, and never makes a player wait.**

Three product principles everything must respect:

| Principle | What it means in practice |
|---|---|
| **Instant** | First paint < 1 s on 4G. No screen transition ever waits on the network. |
| **Reversible** | Every destructive or progress-losing action can be undone, or is confirmed first. |
| **Honest** | The UI never claims security, sync, or scoring it cannot deliver. No fake dashboards. |

**Design language (locked):** navy `#090e19` → gold `#e9bb71` · Arial/Helvetica uppercase tracking · 4–6 px radii · 1 px hairline borders at 8–15 % white · motion 150–450 ms, transform/opacity only.

---

## 3. Architecture decision: what to build on

### Recommendation: **stay vanilla, go modular** — with one deliberate exception

| Option | Verdict | Reasoning |
|---|---|---|
| Keep one `app.js` | ❌ Reject | It is already 627 lines. A quiz engine will triple it and make regressions certain. |
| **Native ES modules** (`type="module"`) | ✅ **Adopt** | Splits code without a build step; GitHub Pages serves `.js` modules fine. Browsers all support it. |
| React / Vue / Svelte | ⚠️ Defer | Justified only when the app has >5 interactive screens with shared state. Revisit at Upgrade 5. |
| Vite + framework | ⚠️ Defer | Adds a build + CI deploy pipeline. Worth it at Upgrade 9 (admin console), not before. |

### Target module layout (Upgrade 3 onward)

```
index.html            # shell: <main class="app"> + 3–5 <section class="screen">
app.js                # bootstrap only: import screens, register router, start
/auth/verify.js       # credential verifier (current auth-config.js logic)
/core/router.js       # showScreen(), history, focus management
/core/store.js        # tiny observable state (≈60 lines, no library)
/core/storage.js      # versioned localStorage wrapper + migrations
/core/audio.js        # existing Web Audio synth, extracted
/core/motion.js       # reduced-motion helpers
/screens/loading.js   # Upgrade 1 (extracted, unchanged behaviour)
/screens/welcome.js   # Upgrade 2
/screens/admin.js     # Upgrade 2 panel
/screens/home.js      # Upgrade 3
/screens/quiz.js      # Upgrade 5
/data/questions/*.json
/data/topics.json
/tests/*.spec.js      # Playwright, one file per screen
```

**Rules:** one screen per module · no module imports another screen directly (router only) · `core/*` never imports `screens/*`.

### Backend decision gate

Do **not** add a backend until **Upgrade 8**. Before then, everything a player needs can be local. When it is needed, the choice is a single gate:

| Need | Minimum viable backend | Notes |
|---|---|---|
| Real admin login | Serverless function (Cloudflare Worker / Vercel / Netlify) with hashed secret in env vars | Replace `auth-config.js` with a `POST /api/admin/login` call; keep the UI identical |
| Global leaderboard | Same function + KV table | Server must validate scores or the board is meaningless |
| Player accounts / sync | Firebase Auth or Supabase | Only if cross-device progress is a real requirement |

> **Acceptance test for any backend move:** if the site's JS can be edited by a player and their score still counts, the backend is wrong.

---

## 4. The upgrade sequence

Each upgrade is shippable on its own, leaves the app playable, and has explicit acceptance criteria. `Est.` is focused working time, not calendar time.

| # | Upgrade | Goal | Est. | Depends on |
|---|---|---|---|---|
| **3** | Home Screen | The player's landing hub after CONTINUE | 2–3 d | — |
| **4** | Player Identity (light) | A name and a face, stored locally | 1–2 d | 3 |
| **5** | Quiz Engine (core loop) | One playable round, start → finish | 4–6 d | 3, 6 |
| **6** | Content Pipeline | Questions as versioned JSON, authored safely | 2–3 d | — |
| **7** | Progression & Feedback | XP, streaks, results, best scores | 3–4 d | 5 |
| **8** | Sync & Leaderboards | Real backend, real global scores | 4–6 d | 5, 7 |
| **9** | Admin Console | Content management without editing code | 5–7 d | 6, 8 |
| **10** | Polish & Hardening | PWA, a11y, performance budget, i18n hooks | 3–4 d | 7 |

**Critical path:** 3 → 6 → 5 → 7. Upgrades 8/9 are parallelisable once 7 lands.

---

## 5. Upgrade detail

### Upgrade 3 — Home Screen

**Why:** The Welcome screen currently dead-ends after admin login. Players need one obvious "play" button.

**Scope**
- New `#screen-home`, reached **only** from a successful admin verification or a player-entry action.
- Content: player greeting line, one primary **PLAY** call-to-action, a compact stats strip (XP · streak · best score — placeholder `—` until Upgrade 7), `BACK` to Welcome.
- Preserve the existing `< BACK` pattern and `CONTINUE` gating exactly.
- Wire the admin success message to a clear "Enter" transition — *this is the Upgrade 3 hook already left in `app.js`*.

**Out of scope:** any quiz screen, profile editing, settings, store.

**Acceptance**
- Home is unreachable on cold load; only via CONTINUE → Welcome → action.
- No layout shift between Welcome and Home; both fit 320×480 without scrolling.
- Back navigation works and restores focus to the originating control.
- 0 console errors; new Playwright `home.spec.js` covering reachability + 7 viewports.

---

### Upgrade 4 — Player Identity (light)

**Why:** A quiz needs a name to greet and a score to attribute. Full accounts are Upgrade 8.

**Scope**
- First-run name entry (3–16 chars, validated), optional preset avatar from a fixed set of 6–8 inline SVG marks (no uploads, no external assets).
- Persisted in `localStorage` under a versioned key: `pgz.player.v1`.
- Skippable → "PLAYER" default. Never blocks play.

**Data shape**
```json
{ "v": 1, "name": "Geon", "avatar": "bolt", "createdAt": 1730000000000 }
```

**Acceptance:** identity survives reload; corrupt/absent data falls back silently; no PII collected; no network call.

---

### Upgrade 6 — Content Pipeline *(build before the engine)*

**Why:** The engine is trivial; bad question data is what kills quiz games. Define the format first.

**Question schema**
```json
{
  "id": "sci-0001",
  "topic": "science",
  "difficulty": "easy",
  "prompt": "Which planet has the most moons?",
  "choices": ["Mars", "Saturn", "Venus", "Mercury"],
  "answer": 1,
  "explain": "Saturn overtook Jupiter in 2023.",
  "source": "NASA",
  "v": 1
}
```

**Rules**
- IDs are immutable and unique; `answer` is an index, validated at load.
- A build-time (or load-time) validator rejects: duplicate IDs, `answer` out of range, <2 or >4 choices, empty prompts, prompts >120 chars.
- Topic and difficulty live in `data/topics.json` so the UI never hardcodes them.
- Content is data, never code — so an admin console (Upgrade 9) can edit it later without redeploy semantics changing.

**Acceptance:** validator has its own test suite incl. deliberately broken fixtures; adding a topic requires touching zero JS files.

---

### Upgrade 5 — Quiz Engine (core loop)

**Scope (one round only)**

```
Home → topic + difficulty pick → 10 questions → per-question feedback → Results
```

- Timer per question **optional and off by default** (timers punish slow readers; show it only in "timed" mode).
- Immediate answer feedback with the `explain` line; no dead ends.
- Progress indicator across 10 questions; exit-with-confirm to protect a round in progress.
- Fully keyboard playable: `1–4` selects, `Enter` confirms, `Esc` opens the exit confirm.
- Results screen: score, per-question review, `PLAY AGAIN` / `HOME`.

**Implementation notes**
- Shuffle choices per round, keep the correct index after shuffle.
- Never trust client-side scoring for anything shared (see Upgrade 8).
- Keep the engine pure: `createRound(questions, options) → roundState`, no DOM access — makes it unit-testable without a browser.

**Acceptance**
- Deterministic with a seeded RNG (needed for reproducible tests).
- 100 % keyboard path verified. Screen-reader announces question change.
- Round survives an accidental reload? **No** — instead warn on `beforeunload` mid-round.
- No layout shift when feedback appears (reserve space).

---

### Upgrade 7 — Progression & Feedback

**Scope**
- XP from correctness + streak bonus; level curve defined in one constant table.
- Daily streak keyed to local date (document the timezone caveat).
- Local best scores per topic/difficulty.
- Small, local-only badges (e.g. "Perfect 10"). No loot boxes, no currency, no purchase surface.

**Guardrails:** progress is *local* and said to be local in the UI until Upgrade 8. Never show a "global rank" that is not real.

---

### Upgrade 8 — Sync & Leaderboards *(first backend)*

**Scope**
- Serverless function: `POST /api/score` with a signed round payload; server recomputes/validates before writing.
- Read-only `GET /api/leaderboard?topic=&difficulty=&window=`.
- Replace client-side admin auth with `POST /api/admin/login` (Argon2id hash in env, HttpOnly cookie). **Delete the PBKDF2 verifier from the bundle at this point** — that is the moment the "not server-grade" caveat in the README can finally be removed.
- Graceful degradation: offline → scores queue locally, UI shows "saved on this device".

---

### Upgrade 9 — Admin Console

**Scope:** authenticated content CRUD (create/edit/disable questions), draft→published states, import/export JSON, and a "validate all" action reusing the Upgrade 6 validator.

**Constraint:** the console is a *separate view* behind the real backend from Upgrade 8. Demands a proper build step (Vite) at this point — the first justified introduction of tooling.

---

### Upgrade 10 — Polish & Hardening

- **PWA:** installable, offline-first shell, update prompt ("New version ready — reload").
- **Accessibility:** full audit against WCAG 2.2 AA; visible focus everywhere; `prefers-contrast` support; screen-reader pass on the quiz loop.
- **Performance budget** (enforced in CI): JS ≤ 60 KB gz, CSS ≤ 30 KB gz, LCP ≤ 1.8 s on mid-tier mobile, CLS ≤ 0.02, no long task > 100 ms on load.
- **i18n hooks:** all user-facing strings in one dictionary module; English only until a translation is requested.

---

## 6. Design system consolidation (do this during Upgrade 3)

`style.css` is 1,489 lines and already contains one-off values. Before adding quiz UI:

1. **Extract tokens** into `:root`: colour (`--bg`, `--gold`, `--gold-soft`, `--text`, `--muted`, `--error`, `--success`), spacing scale (`--s1:4px … --s8:48px`), radii, durations, easing.
2. **Name the components** that already exist: `.action` (gold / outline / ghost), `.panel`, `.field`, `.eyebrow`, `.title-rule`, `.topbar`, `.screen`. Document variants in the roadmap, not in code comments alone.
3. **Split the file** by layer: `base.css` (reset+tokens), `components.css`, `screens/*.css`. One `@import` in `index.html` per layer, or keep a single file if the build step arrives at Upgrade 9.
4. **Motion contract:** entrance = opacity + ≤12 px rise, 300–450 ms; feedback = 150 ms; nothing loops except ambient background effects; all of it disabled under `prefers-reduced-motion`.

**Responsive contract:** test every screen at **320×480, 360×640, 393×851, 768×1024, 1280×800, 1440×900, 851×393** (landscape). No page-level scrolling on any screen; panels may scroll internally on short viewports.

---

## 7. Quality gates (adopt now, before the codebase grows)

| Gate | Rule |
|---|---|
| **Tests** | One Playwright spec per screen. Every upgrade adds cases for its own acceptance criteria. No PR merges with a failing spec. |
| **CI** | GitHub Actions: `npm ci && npx playwright test` on every PR; run the responsive matrix on the 7 contract viewports. |
| **Console-clean** | Zero `console.error`/`warning` and zero page errors, asserted in tests — not checked by hand. |
| **A11y** | Keyboard-only path per screen; `aria-live` for async outcomes; focus returns to the triggering control after any panel closes. |
| **Bundle discipline** | No new dependency without a written justification + size measurement. Current: **0 runtime deps** — keep it that way through Upgrade 7. |
| **Cache discipline** | Bump `sw.js` cache version in the same commit as any asset change; keep network-first so deploys appear on the next load. |
| **Docs** | README + this roadmap updated in the same PR as the behaviour change. |

---

## 8. Risks & mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| **Client-side admin auth is bypassable** | Anyone can "enter" as admin | Nothing sensitive behind it until Upgrade 8; state the limitation in UI and README (already done) |
| **Content quality** | Bad questions = unplayable game | Schema + validator ship **before** the engine (Upgrade 6 precedes 5) |
| **Scope creep** | Half-built screens everywhere | One upgrade = one shippable increment; out-of-scope list in every prompt |
| **Single-file CSS rot** | Visual inconsistency, impossible refactors | Token extraction scheduled in Upgrade 3, not "later" |
| **Offline/online drift** | Player loses progress silently | Queue + explicit "saved on this device" state from Upgrade 8 |
| **Cheating on leaderboards** | Board becomes meaningless | Server-side validation only; never trust client scores |
| **Accessibility regressions** | Excludes players; rework cost | Keyboard path is an acceptance criterion per screen, not a final audit |
| **Mobile viewport bugs** | Broken layouts on real devices | 7-viewport matrix in CI + `dvh` units + safe-area insets (already in use) |

---

## 9. Milestones

| Milestone | Contains | Definition of done |
|---|---|---|
| **M1 — Playable** | Upgrades 3, 6, 5 | A stranger can load the site, press CONTINUE, tap PLAY, and finish a 10-question round on a phone. |
| **M2 — Rewarding** | Upgrade 7 (+ 4) | Progress persists, results feel earned, best scores visible. |
| **M3 — Shared** | Upgrade 8 | Real backend, honest leaderboard, real admin login. |
| **M4 — Operable** | Upgrade 9 | Owner updates content without touching code. |
| **M5 — Durable** | Upgrade 10 | Installable PWA, WCAG 2.2 AA, performance budget enforced in CI. |

---

## 10. KPIs

| Metric | Target |
|---|---|
| Time to first question (cold load on 4G) | ≤ 3 s |
| Round completion rate | ≥ 70 % of started rounds |
| Return rate (7-day) | ≥ 25 % |
| Mobile share of sessions | tracked, not targeted |
| Console errors per session | 0 |
| Lighthouse PWA / a11y / perf (mobile) | ≥ 90 / ≥ 95 / ≥ 90 |

---

## 11. Open questions for the project owner

1. **Backend appetite (blocks Upgrade 8):** acceptable to deploy one serverless function, or must the game stay 100 % static forever? If static forever, leaderboards and real admin auth are permanently off the table and the roadmap stops at M2.
2. **Question volume:** how many questions exist / who authors them? This decides whether Upgrade 9 is needed in year one.
3. **Languages:** English only, or is Filipino/Tagalog expected? (Cheap now, expensive after the quiz ships.)
4. **Timer:** should timed mode exist at all, or is it always untimed?
5. **Branding:** does "V.1" stay after the quiz launches, or does it bump to V.2 at M1?

---

## 12. Immediate next step (recommended)

**Start Upgrade 3 (Home Screen) + CSS token extraction in one increment.**

Rationale: it is the smallest change that turns the app from *a menu into a game*, it unblocks Upgrades 4–7, and doing the token extraction *while* adding a screen is far cheaper than retrofitting it across five screens later.

Deliverables for that increment: `#screen-home`, router module, extracted design tokens, `home.spec.js`, updated README, `sw.js` cache bump, all 36 existing tests still green.

---

*This document is a plan. No application code, assets, tests, or deployments were modified to produce it.*
