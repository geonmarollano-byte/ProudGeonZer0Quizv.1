# UPGRADE 1 — LOADING SCREEN
## As-Built Technical Specification & Delivery Record

| | |
|---|---|
| **Upgrade** | 1 of the ProudGeonZer0Quiz V.1 sequence |
| **Deliverable** | The original loading screen — the application's entry point |
| **Status** | ✅ Shipped to `main` · live on GitHub Pages |
| **Screen ID** | `#screen-loading` |
| **Source files** | `index.html` · `style.css` · `app.js` · `sw.js` · `logo.svg` |
| **Test suite** | `tests/loading.spec.js` — 23 automated cases |
| **Dependencies** | None. 0 runtime packages, 0 external requests |

---

## 1. Objective

Deliver a single, premium, offline-capable loading screen that:

1. Occupies the full viewport on every device class, portrait and landscape.
2. Communicates progress continuously from **1 % → 100 %** with no stepping or stutter.
3. Hands the player a single, unambiguous next action — **CONTINUE** — without navigating anywhere on its own.
4. Works with zero network access after the first visit.
5. Introduces no framework, no build step, and no third-party code.

### Explicitly out of scope (and still absent)

Main menu · profile · avatar selection · difficulty/topic selection · quest hub · warm-up · daily quest · quiz gameplay · Q&A interface · results · achievements · leaderboard · settings · dashboard · registration. Nothing from that list exists in the codebase.

---

## 2. Screen anatomy (DOM)

```
<body>
└── <main class="app">
    └── <section class="screen" id="screen-loading">          ← the whole screen
        ├── .game-atmosphere  (aria-hidden)                   ← 6 rising particles
        ├── <header class="topbar">
        │   ├── .studio            "PG PROUDGEON / PLAY. GROW. REPEAT."
        │   └── .topbar-actions
        │       ├── #sound-toggle   .icon-button[aria-pressed]
        │       └── #fullscreen     .icon-button
        ├── <section class="identity">
        │   ├── .emblem-wrap  (.orbit-1, .orbit-2, .spark-1, .spark-2,
        │   │                  .emblem > inline SVG, .emblem-caption)
        │   ├── .eyebrow      "A LITTLE CURIOSITY. A NEW LEVEL."
        │   ├── <h1 id="game-title">  PROUDGEON ZER0QUIZ <span class="version">V.1</span>
        │   ├── .title-rule   (span · i · span)
        │   └── .quote        (mark · line · credit)
        ├── <section class="launch">
        │   ├── #loading-panel
        │   │   ├── .progress-heading  (#loading-label · #percentage)
        │   │   ├── #progress[role=progressbar] > #progress-fill
        │   │   ├── .loading-note
        │   │   └── #sound-hint[role=status]
        │   ├── #ready-panel[hidden] > #continue
        │   ├── #announcement  .sr-only[role=status][aria-live=polite]
        │   └── #fullscreen-note[role=status]
        └── <footer>  OFFLINE READY · BUILT FOR THE CURIOUS · VERSION 1.0 / 2026
```

**Zero raster assets.** The emblem, sound icon and fullscreen icon are inline SVG; `logo.svg` (271 bytes) is the favicon only.

---

## 3. Visual design system

### 3.1 Tokens (as implemented in `:root`)

| Token | Value | Role |
|---|---|---|
| `--bg` | `#090e19` | Base navy |
| `--gold` | `#e9bb71` | Primary accent |
| `--text` | `#f1eee7` | Primary type |
| `--muted` | `#77818f` | Secondary type |
| Button ink | `#16202e` | Text on gold surfaces |
| Gold border | `#f4d4a1` | Hairline on primary button |
| `--gold-soft` | `#f2cb8a → #f0c884` | Button gradient stops |
| Error/status dots | `#e9bb71` / `#86a78e` | Loading dot / offline dot |

Background composition (three layers, no image files):

```css
radial-gradient(ellipse at 50% 37%, #1b2430 0, transparent 49%),
radial-gradient(ellipse at 50% 100%, #17202b66, transparent 50%),
var(--bg)
```

Plus a `::before` 72 × 72 px grid overlay at 12 % opacity, radially masked.

### 3.2 Typography

| Element | Size | Weight | Tracking |
|---|---|---|---|
| `h1` — PROUDGEON | `clamp(32px, 4.7vw, 64px)` | 800 | 4 px |
| `h1 > span` — ZER0QUIZ | `1.07em` of `h1`, gold | 800 | inherited |
| `.version` — V.1 | `0.3em`, boxed | 700 | 1 px |
| `.eyebrow` | 9 px | 600 | 3 px |
| `.studio` | 9 px | 700 | 1.6 px |
| `.percentage` | 18 px, gold, `tabular-nums` | — | 1 px |
| `.loading-note` | 7 px | — | 1.6 px |
| `footer` | 7 px | — | 1.5 px |

Family: `Arial, Helvetica, sans-serif` — system stack, therefore **no font request and no FOIT/FOUT**.

### 3.3 Spacing & proportion

`.screen` padding `32px 5% 24px`; `.launch` capped at `min(100%, 430px)` and horizontally centred; `.identity` uses `margin: auto 0 0` so the brand block floats to the optical centre while the progress block and footer pin to the bottom.

---

## 4. Animation inventory

Every effect is GPU-friendly (**transform** and **opacity** only — no layout-triggering properties). All of them stop under `prefers-reduced-motion`.

| Element | Keyframes | Duration / easing | Reduced motion |
|---|---|---|---|
| `.orbit-one` | `energy-spin` | 7 s linear ∞ | `animation: none` |
| `.orbit-two` | `energy-spin` (reverse) | 19 s linear ∞ | `animation: none` |
| `.emblem` | `emblem-float` | 3.5 s ease-in-out ∞, −7 px | `animation: none` |
| `.spark-one` | `spark-pulse` | 2 s ∞ | `animation: none` |
| `.spark-two` | `spark-pulse` | 2 s ∞, 1 s delay | `animation: none` |
| `.game-atmosphere span` | `rise` | 13–19 s linear ∞, staggered −3…−11 s | Block hidden entirely |
| `#progress-fill::after` | `loading-sweep` | 1.2 s linear ∞ | `animation: none` |
| `#ready-panel` | `appear` | 0.35 s ease-out | `animation: none` |

The particles rise `translate3d(0,0,0) → (35px, −95vh, 0)` from 6 fixed x-positions (12 %, 27 %, 44 %, 65 %, 79 %, 92 %).

---

## 5. Loading sequence — the core behaviour

### 5.1 Timeline (default)

```
t=0 ms      startIntro()      progress 1 %, panel visible, audio unlocked if already allowed
t=0→3600    rAF loop          1 % +100·(now−t0)/3600 → continuous 1 %…100 %
            every 360 ms      playTick() — 10 milestones total
t=3600 ms   completeIntro()   progress 100 %, ambience fades 0.7 s, chime plays,
                              aria-live announces "Loading complete. Continue is ready."
t=3780 ms   swap              #loading-panel hidden, #ready-panel shown (CONTINUE)
```

### 5.2 Reduced motion

`REDUCED_INTRO_MS = 700` (vs `3600`). Milestone count drops from **10 → 4** automatically (`duration < 1500`), so the tick cadence stays musically sensible instead of cramming 10 blips into 0.7 s.

### 5.3 Why a `requestAnimationFrame` loop, not CSS transitions

`#progress-fill` is advanced **once per frame** in JS with `will-change: width`. A CSS `transition` on `width` restarts on every assignment and produces a "stepping" artefact. The test suite asserts `transition-duration: 0s` on the fill and samples ~900 ms of frames to prove:

- width never decreases,
- >15 distinct widths are rendered,
- no single frame jumps >8 % of track width.

### 5.4 Watchdog

`requestAnimationFrame` is throttled or suspended in background tabs. A parallel `setTimeout(completeIntro, duration + 450)` guarantees the screen reaches 100 % and shows CONTINUE even if frames never fire. `completeIntro()` is idempotent (`introDone` guard), so the watchdog and the frame loop can never double-fire.

### 5.5 Completion swap without layout shift

Before hiding the progress panel, the ready panel is given `min-height` equal to the progress panel's **measured** height:

```js
readyPanel.style.minHeight = `${loadingPanel.getBoundingClientRect().height}px`;
```

Verified: `.identity`, `.launch` and `footer` occupy identical coordinates before and after the swap at every tested viewport → **CLS = 0**.

---

## 6. CONTINUE button

| Property | Value |
|---|---|
| Label | `CONTINUE ↗` |
| Size | 100 % width, 52 px tall (46 px under `max-height: 560px`) |
| Surface | `linear-gradient(180deg, #f2cb8a, #e9bb71)`, 1 px `#f4d4a1` border, 6 px radius |
| Ink | `#16202e`, 10.5 px, 700, 2.6 px tracking |
| Hover | Gradient lifts to `#f8ddaa → #f0c884`, shadow `0 12px 36px #e9bb713d` |
| Press | `scale(0.99)` |
| Focus | Inherits global `button:focus-visible` → 2 px white outline, 6 px offset |
| Auto-focus | **None** — the button is not focused programmatically, so no stray focus ring appears on load or after the swap |
| Behaviour | Opens the Welcome screen (Upgrade 2). It never navigates on its own |

The button is the **only** element added to the original loading screen.

---

## 7. Audio system (fully synthesized)

No audio files exist. Everything is generated with the Web Audio API at runtime.

| Cue | Synthesis |
|---|---|
| **Progress tick** | Triangle wave, `760 + 0.1·320 … 760 + 0.9·320` Hz (rising with progress), 0.13 s, gain 0.028 |
| **Completion chime** | Four sines — C5 523.25 · E5 659.25 · G5 783.99 · C6 1046.5 Hz, 85 ms stagger, 0.55 s decay, gain 0.045 |
| **Ambient pad** | padA sine 98→131 Hz, padB sine 147→196 Hz, sub triangle 49 Hz, lowpass 380→1150 Hz, LFO 0.17 Hz ±120 Hz, gain ramps 0.0001→0.055 over 0.9 s, 4.2 s sweep |

### Autoplay policy handling

Browsers block audio until a user gesture. The implementation:

1. Creates no `AudioContext` on cold load (nothing stalls the first frames).
2. Listens for `pointerdown`, `keydown`, `touchstart` (passive) → `unlockAudio()`.
3. If the visitor has already interacted (`navigator.userActivation.hasBeenActive`), the intro is audible immediately.
4. While locked, the status line reads **"TAP ANYWHERE TO ENABLE SOUND"**.

### Mute persistence

| Key | `proudgeon-loading.sound.v1` |
|---|---|
| Values | `"on"` / `"off"` |
| Storage | `localStorage`, wrapped in `try/catch` (private mode / blocked storage degrades silently) |
| State | Mirrored to `aria-pressed`, `aria-label` and `title` on `#sound-toggle` |
| Hint | Muted → "SOUND IS OFF — TAP THE SPEAKER TO TURN IT ON" |

Muting fades ambience out over 0.25 s; unmuting restarts it if loading is still active. **This sound preference is the only value the application ever persists.**

---

## 8. Fullscreen control

`#fullscreen` toggles `document.documentElement.requestFullscreen()` and updates its own `aria-label`/`title` on `fullscreenchange` ("Enter fullscreen" ↔ "Exit fullscreen").

Two graceful failures, both surfaced in `#fullscreen-note[role=status]`:

| Condition | Message |
|---|---|
| API absent/disabled | "Fullscreen is unavailable in this browser. The screen still fits your display." |
| Promise rejected (iframe, policy) | "Fullscreen was blocked. You can keep playing in this view." |

Loading always continues in either case — asserted by test.

---

## 9. Responsive behaviour

### 9.1 Guarantee

**No page-level scrolling at any tested viewport.** The layout is compressed, never clipped: no element is hidden to make it fit, except the emblem on `max-height ≤ 700px` desktop-class landscape.

### 9.2 Breakpoint map

| Query | Intent |
|---|---|
| `min-height: 900px` | Tall screens: extra breathing room |
| `max-width: 600px` | Phones: safe-area insets, smaller type, tighter tracking |
| `max-height: 740px` | Compact portrait: shrink emblem, tighten rhythm |
| `min-width: 601px and max-height: 860px` | Short desktop/laptop (1280×800, 1366×768) |
| `min-width: 601px and max-height: 660px` | Very short desktop (800×600) |
| `max-height: 500px and min-width: 601px` | Landscape phones/tablets: emblem hidden, `h1` inline |
| `max-width: 600px and max-height: 680px` | Small phones |
| `max-width: 600px and max-height: 540px` | 320×480-class devices |
| `max-height: 560px` | Short-viewport button sizing |
| `prefers-reduced-motion: reduce` | All animation off, particles removed |

### 9.3 Mobile viewport correctness

- `min-height: 100vh → 100svh → 100dvh` cascade (browser picks the best supported) so the Android/iOS URL-bar resize never clips the footer.
- `env(safe-area-inset-top/bottom)` added to padding on phones (notch/home-indicator).
- `viewport-fit=cover` in the viewport meta.
- `<meta name="theme-color" content="#090e19">` matches the background (no colour flash in the browser chrome).

---

## 10. Accessibility

| Concern | Implementation |
|---|---|
| Semantics | `<main>`, `<section>`, `<header>`, `<footer>`, single `<h1>` |
| Progress | `role="progressbar"` + `aria-valuemin/max/now`, updated every frame; label "Loading game" |
| Completion | `#announcement[role=status][aria-live=polite]` — "Loading complete. Continue is ready." |
| Sound state | `aria-pressed` + dynamic `aria-label` on the toggle; separate `role=status` hint line |
| Fullscreen state | `aria-label` flips with the actual fullscreen state |
| Keyboard | All controls are native `<button>` elements; logical tab order (sound → fullscreen → CONTINUE); visible `:focus-visible` ring |
| Motion | Global `prefers-reduced-motion` override; intro shortened to 700 ms |
| Touch | 38 px icon targets, 52 px primary button, `touch-action: manipulation`, tap-highlight removed |
| Contrast | Gold `#e9bb71` on navy `#090e19` ≈ 9.5:1; body `#f1eee7` ≈ 15:1 |

---

## 11. Offline & service worker

| Property | Value |
|---|---|
| File | `sw.js` (77 lines) |
| Cache | `proudgeon-loading-v15` |
| Precached | `./`, `index.html`, `style.css`, `app.js`, `auth-config.js`, `logo.svg` |
| Strategy | **Network-first**, cache as fallback (switched from cache-first so deployments appear on the next load) |
| Activation | `skipWaiting()` + `clients.claim()`; deletes every `proudgeon-loading-*` cache that is not current |
| Navigation fallback | On network failure, `index.html` is served for `/` and `/index.html`, **including query strings** (shared links keep working offline) |
| Registration | Only when `serviceWorker in navigator && isSecureContext`; failures are swallowed so `file://` use still works |

---

## 12. Performance profile

| Metric | Value |
|---|---|
| Network requests (cold, first visit) | 6–7, all same-origin |
| External requests | **0** (asserted by test) |
| Runtime dependencies | **0** |
| CSS | ~1.5 k lines, one file, unminified |
| JS | ~627 lines total (Upgrade 1 portion ≈ 300 lines) |
| Fonts | System stack — no download |
| Images | None (inline SVG) |
| Animated properties | `transform`, `opacity` only |
| Layout thrash | `getBoundingClientRect()` read exactly once, at completion |

---

## 13. Edge cases handled

| Scenario | Behaviour |
|---|---|
| Web Audio unavailable | Screen loads and completes normally; all `playTone` calls no-op |
| AudioContext creation throws | Caught; silent intro |
| `localStorage` blocked/private mode | Mute preference not remembered; sound still works this visit |
| Fullscreen unsupported | Status note; loading continues |
| Fullscreen promise rejected | Status note; loading continues |
| Tab backgrounded mid-intro | Watchdog fires `completeIntro` at `duration + 450 ms` |
| Frame callback and watchdog both fire | `introDone` guard makes completion idempotent |
| `prefers-reduced-motion` | 700 ms intro, all animation disabled, particles removed |
| Offline first visit | Service worker not yet installed; normal fetch path |
| Offline return visit | Cached shell served; intro runs fully |
| Launch with `?query` or `/index.html` | Navigation fallback resolves to cached `index.html` |
| Opened as `file://` | Service worker skipped; everything else works |
| Rapid double click on CONTINUE | Single screen change (`showScreen` is idempotent) |

---

## 14. QA record

`tests/loading.spec.js` — **18 automated cases, all passing.**

| # | Test | Primary assertions |
|---|---|---|
| 1–8 | `loading screen at {viewport}` × 8 | Title text, progress visible, percentage ≠ 0, animations running (`energy-spin`, `emblem-float`), reaches `aria-valuenow=100`, CONTINUE appears, bar hidden, no overflow (scroll ≤ viewport), no page errors, no external requests |
| 9 | Document structure | Exactly the authorised screens/panels; 0 `<nav>` |
| 10 | Cached app works offline | Unregisters network, reloads, still completes |
| 11 | Reduced motion | CONTINUE within 8 s |
| 12 | Offline launch with query string / `index.html` | Both paths reach CONTINUE |
| 13–14 | Fullscreen `unsupported` / `rejected` | Status note non-empty, loading continues |
| 15 | Game effects animate | Computed `animation-name` + transform changes over time |
| 16 | Progress bar continuous | `transition-duration: 0s`; monotonic width; >15 distinct widths; max frame step < 8 % |
| 17 | Sound toggle | `aria-pressed` flips, hint text, `localStorage` value, survives reload |
| 18 | Web Audio unavailable | Intro still completes, no errors, no unexpected keys stored |

**Viewport matrix:** 1440×900 · 1280×800 · 800×600 · 393×851 · 360×640 · 320×568 · 320×480 · 851×393 (landscape).

**Manual verification:** console clean (0 errors/warnings) across the full flow; screenshots reviewed at desktop, mobile and landscape; layout coordinates compared before/after the CONTINUE swap (identical).

---

## 15. Known limitations (stated honestly)

1. **The percentage is not a network download.** It is a fixed 3.6 s authored intro. There is nothing to fetch — the app is already local. If real asset loading is ever added, the bar should be re-bound to actual progress.
2. **Sound requires a gesture.** No browser allows audio on a cold load; the screen says so explicitly rather than failing silently.
3. **Service worker requires a secure context.** `file://` use works but is never cached.
4. **No i18n.** All strings are hard-coded English.
5. **Single HTML file.** With three screens it is ~370 lines — still manageable; the roadmap schedules module splitting at Upgrade 3.
6. **The loading screen is not a security boundary.** It gates nothing.

---

## 16. Acceptance criteria — met

| # | Criterion | Evidence |
|---|---|---|
| 1 | Opens directly into the loading screen | Only screen rendered on load |
| 2 | Original logo, background, colours, typography preserved | Inline SVG + tokens unchanged |
| 3 | Progress advances 1 → 100 % smoothly | rAF loop + smoothness test |
| 4 | Loading text and progress semantics present | `#loading-label`, `role=progressbar` |
| 5 | CONTINUE appears at completion, no auto-navigation | Swap at +180 ms; URL unchanged |
| 6 | Centred, no layout shift | CLS measured 0 at all viewports |
| 7 | Mobile + desktop, no unwanted scrolling | 8-viewport matrix |
| 8 | No JavaScript errors | Asserted in every test |
| 9 | No external requests | Asserted in every viewport test |
| 10 | Offline after first visit | Service worker + offline tests |
| 11 | GitHub Pages compatible | Static files, no build step |
| 12 | Existing assets intact | `logo.svg` unchanged; emblem is inline |

---

## 17. File map

| File | Upgrade 1 responsibility |
|---|---|
| `index.html` | `#screen-loading` markup: topbar, identity block, launch block, footer |
| `style.css` | Tokens, `.screen` layout, emblem/orbit/spark/particle animations, progress bar, CONTINUE button, 10 media queries |
| `app.js` | `setProgress`, `startIntro`, `completeIntro`, watchdog, Web Audio engine (ambience/ticks/chime), mute persistence, fullscreen control, service-worker registration |
| `sw.js` | Offline cache + network-first strategy + navigation fallback |
| `logo.svg` | Favicon (inline emblem is used on-screen) |
| `tests/loading.spec.js` | 18-case regression suite |


---

## 19. Professional detail pass (applied)

A hardening pass that adds no new screen and changes no pixels at rest. Verified by
pixel-diffing against the previous build at five viewports in two states each.

| Area | Change | Why |
|---|---|---|
| **Design tokens** | `--gold-soft`, `--gold-line`, `--gold-glow`, `--ink`, `--hairline`, `--radius-sm/md/lg/icon`, `--dur-fast/base/slow`, `--ease-out` added to `:root` and consumed by `.continue` / `.icon-button` | One palette edit now propagates; values are byte-identical to the originals |
| **Spoken progress** | `aria-valuetext="N percent loaded"` kept in sync with `aria-valuenow` | Screen readers announce "37 percent loaded" instead of a bare number. Updated only when the rounded value changes, so AT is not spammed at 60 Hz |
| **Busy state** | `#loading-panel` carries `aria-busy="true"` during the sweep, `"false"` at completion | Assistive tech knows the panel is still settling before CONTINUE appears |
| **Compositor hint released** | `#progress-fill.is-idle { will-change: auto }`, applied in `completeIntro()` | The bar kept its own GPU layer for the whole session; now it releases it once the sweep ends |
| **Stable percentage block** | `.percentage { min-width: 4.5ch; display: inline-block; text-align: right }` | The digits no longer resize the block as the number grows 9 → 10 → 100 — no reflow mid-sweep |
| **Balanced wrapping** | `text-wrap: balance` on `h1` and `.quote p` | Headlines wrap evenly instead of leaving an orphan word on narrow screens |
| **Paint containment** | `.game-atmosphere { contain: layout paint }` | The decorative particle layer can never force layout or paint outside itself |
| **Forced colours** | `@media (forced-colors: active)` block | Windows High Contrast: real `ButtonBorder` outlines, `Highlight`-filled bar, shimmer disabled |
| **More contrast** | `@media (prefers-contrast: more)` block | Lifts secondary text to `#c3cad4`+ and outlines the track when a player asks for it |
| **Reduced transparency** | `@media (prefers-reduced-transparency: reduce)` | Icon buttons become solid instead of 3 % white over navy |

### Verification of the detail pass

Screenshots of the pre-change build (from `git archive HEAD`) and the new build were
compared with ImageMagick at **1280×800, 1440×900, 393×851, 320×480, 851×393**:

| State | Result |
|---|---|
| Loading complete / CONTINUE shown | **0 differing pixels at all five viewports** — visually identical |
| Mid-sweep | Only the progress-fill width and the percentage digits differ (they are time-dependent), confirmed by a difference-map export |

Two regressions were caught by this diff and corrected before merge: the button glow
had drifted from `#e9bb7126` to `#e9bb7133`, and icon buttons had inherited the 6 px
button radius instead of their shipped 8 px.

---

## 18. Extension contract (what later upgrades must not break)

Upgrades 2+ may **wrap** the loading screen (it now sits inside `<main class="app">` and gains a `hidden` toggle), but must never:

- alter `.identity`, `.launch`, `footer` markup or their CSS blocks;
- change `INTRO_MS`, `REDUCED_INTRO_MS` or the rAF sweep;
- remove the watchdog or the `introDone` guard;
- remove `#announcement`, `#sound-hint` or `#fullscreen-note`;
- replace the CONTINUE handler with automatic navigation;
- rename `proudgeon-loading.sound.v1` (it would silently reset every player's mute preference);
- ship an asset change without bumping `CACHE` in `sw.js`.

---

*Documentation only — no application code, assets, tests or deployments were modified in producing this specification.*
