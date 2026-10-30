"use strict";

const percentage = document.querySelector("#percentage");
const progress = document.querySelector("#progress");
const fill = document.querySelector("#progress-fill");
const announcement = document.querySelector("#announcement");
const fullscreenButton = document.querySelector("#fullscreen");
const fullscreenNote = document.querySelector("#fullscreen-note");
const soundToggle = document.querySelector("#sound-toggle");
const soundHint = document.querySelector("#sound-hint");
const loadingPanel = document.querySelector("#loading-panel");
const readyPanel = document.querySelector("#ready-panel");
const loadingScreen = document.querySelector("#screen-loading");
const welcomeScreen = document.querySelector("#screen-welcome");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

/* ================= SOUND ================= */
// All audio is synthesized with Web Audio, so nothing extra has to download.
const SOUND_KEY = "proudgeon-loading.sound.v1";
let soundEnabled = true;
try {
  soundEnabled = window.localStorage.getItem(SOUND_KEY) !== "off";
} catch {
  /* Storage can be blocked; sound still works for this visit. */
}

let audio = null;
let ambience = null;
let loadingActive = false;

function getAudio() {
  if (audio) return audio;
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) return null;
  try {
    const context = new AudioCtor();
    const master = context.createGain();
    master.gain.value = 0.5;
    master.connect(context.destination);
    audio = { context, master };
    return audio;
  } catch {
    return null;
  }
}

function audioRunning() {
  return Boolean(audio && audio.context.state === "running");
}

/* Browsers only allow sound after a gesture, so this is called from input events. */
function unlockAudio() {
  const engine = getAudio();
  if (!engine) return;
  const resume =
    engine.context.state === "running"
      ? Promise.resolve()
      : engine.context.resume().catch(() => {});
  void resume.then(() => {
    updateSoundHint();
    if (audioRunning() && loadingActive && soundEnabled && !ambience) {
      startAmbience();
    }
  });
}

const AMBIENCE_SECONDS = 4.2;

function startAmbience() {
  if (!soundEnabled || ambience) return;
  const engine = getAudio();
  if (!engine || engine.context.state !== "running") return;
  const { context, master } = engine;
  const now = context.currentTime;

  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.055, now + 0.9);

  const filter = context.createBiquadFilter();
  filter.type = "lowpass";
  filter.Q.value = 0.7;
  filter.frequency.setValueAtTime(380, now);
  filter.frequency.linearRampToValueAtTime(1150, now + AMBIENCE_SECONDS);

  const padA = context.createOscillator();
  padA.type = "sine";
  padA.frequency.setValueAtTime(98, now);
  padA.frequency.linearRampToValueAtTime(131, now + AMBIENCE_SECONDS);

  const padB = context.createOscillator();
  padB.type = "sine";
  padB.frequency.setValueAtTime(147, now);
  padB.frequency.linearRampToValueAtTime(196, now + AMBIENCE_SECONDS);

  const sub = context.createOscillator();
  sub.type = "triangle";
  sub.frequency.setValueAtTime(49, now);
  const subGain = context.createGain();
  subGain.gain.value = 0.4;

  // Slow breathing movement so the pad never sits still.
  const lfo = context.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = 0.17;
  const lfoGain = context.createGain();
  lfoGain.gain.value = 120;

  padA.connect(filter);
  padB.connect(filter);
  sub.connect(subGain).connect(filter);
  lfo.connect(lfoGain).connect(filter.frequency);
  filter.connect(gain).connect(master);

  padA.start(now);
  padB.start(now);
  sub.start(now);
  lfo.start(now);

  ambience = { gain, oscs: [padA, padB, sub, lfo] };
}

function stopAmbience(fade = 0.4) {
  if (!ambience) return;
  const engine = audio;
  const { gain, oscs } = ambience;
  ambience = null;
  if (!engine) return;
  const now = engine.context.currentTime;
  try {
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + fade);
    oscs.forEach((osc) => osc.stop(now + fade + 0.1));
  } catch {
    /* Already stopped; nothing to clean up. */
  }
}

function playTone({
  frequency,
  delay = 0,
  duration = 0.2,
  volume = 0.05,
  type = "sine",
}) {
  if (!soundEnabled || !audioRunning()) return;
  const { context, master } = audio;
  const start = context.currentTime + delay;
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(master);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

function playTick(ascend = 0.5) {
  playTone({
    frequency: 760 + ascend * 320,
    duration: 0.13,
    volume: 0.028,
    type: "triangle",
  });
}

function playChime() {
  [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
    playTone({
      frequency,
      delay: index * 0.085,
      duration: 0.55,
      volume: 0.045,
      type: "sine",
    });
  });
}

function updateSoundHint() {
  if (!soundToggle) return;
  soundToggle.setAttribute("aria-pressed", String(soundEnabled));
  const label = soundEnabled ? "Mute sound" : "Unmute sound";
  soundToggle.setAttribute("aria-label", label);
  soundToggle.title = label;
  if (!soundHint) return;
  if (!soundEnabled) {
    soundHint.textContent = "SOUND IS OFF — TAP THE SPEAKER TO TURN IT ON";
  } else if (!audioRunning()) {
    soundHint.textContent = "TAP ANYWHERE TO ENABLE SOUND";
  } else {
    soundHint.textContent = "";
  }
}

soundToggle.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  try {
    window.localStorage.setItem(SOUND_KEY, soundEnabled ? "on" : "off");
  } catch {
    /* Preference just is not remembered in this browser. */
  }
  if (soundEnabled) {
    unlockAudio();
    if (loadingActive && !ambience) startAmbience();
  } else {
    stopAmbience(0.25);
  }
  updateSoundHint();
});

/* Any interaction is enough to let the browser start audio. */
["pointerdown", "keydown", "touchstart"].forEach((type) => {
  window.addEventListener(type, unlockAudio, { passive: true });
});

/* ================= LOADING INTRO ================= */
const INTRO_MS = 3600;
const REDUCED_INTRO_MS = 700;
let introFrame = 0;
let introDone = false;
let introWatchdog = 0;

function setProgress(value) {
  const clamped = Math.min(100, Math.max(0, value));
  fill.style.width = `${clamped}%`;
  // Round for the label and screen readers, but keep the bar itself smooth.
  const shown = Math.round(clamped);
  if (percentage.textContent !== String(shown)) {
    percentage.textContent = String(shown);
  }
  progress.setAttribute("aria-valuenow", String(shown));
}

function startIntro() {
  window.cancelAnimationFrame(introFrame);
  window.clearTimeout(introWatchdog);
  introDone = false;
  announcement.textContent = "";
  setProgress(1);
  loadingPanel.hidden = false;
  readyPanel.hidden = true;

  const duration = reduceMotion.matches ? REDUCED_INTRO_MS : INTRO_MS;
  const milestones = duration < 1500 ? 4 : 10;
  const startedAt = performance.now();
  let lastMilestone = 0;

  loadingActive = true;
  // Audio is only created after a real user gesture (browser autoplay rules).
  // A cold page load stays silent and never stalls the first frames, but a
  // visitor who already interacted with the page hears the intro right away.
  stopAmbience(0.15);
  updateSoundHint();
  if (soundEnabled && navigator.userActivation?.hasBeenActive) unlockAudio();

  function frame(now) {
    const elapsed = Math.min(1, (now - startedAt) / duration);
    // One continuous sweep: no timers, no restarted CSS transitions.
    setProgress(1 + elapsed * 99);

    const milestone = Math.floor(elapsed * milestones);
    if (milestone > lastMilestone) {
      lastMilestone = milestone;
      try {
        playTick(milestone / milestones);
      } catch {
        /* A missed blip must never stop the animation. */
      }
    }

    if (elapsed < 1) {
      introFrame = window.requestAnimationFrame(frame);
      return;
    }
    completeIntro();
  }

  introFrame = window.requestAnimationFrame(frame);
  // Frames stop when a tab is throttled or hidden; this keeps the intro honest.
  introWatchdog = window.setTimeout(completeIntro, duration + 450);
}

function completeIntro() {
  if (introDone) return;
  introDone = true;
  window.clearTimeout(introWatchdog);
  window.cancelAnimationFrame(introFrame);
  setProgress(100);
  loadingActive = false;
  stopAmbience(0.7);
  playChime();
  announcement.textContent = "Loading complete. Continue is ready.";
  updateSoundHint();
  // Let 100% paint once, then swap the progress bar for the Continue button.
  window.setTimeout(() => {
    // Reserve the bar's exact height so nothing on the screen shifts.
    readyPanel.style.minHeight = `${loadingPanel.getBoundingClientRect().height}px`;
    loadingPanel.hidden = true;
    readyPanel.hidden = false;
  }, 180);
}

updateSoundHint();

if (document.readyState === "complete") startIntro();
else window.addEventListener("load", startIntro, { once: true });

/* ================= FULLSCREEN ================= */
async function enterFullscreen() {
  if (
    !document.fullscreenEnabled ||
    !document.documentElement.requestFullscreen
  ) {
    fullscreenNote.textContent =
      "Fullscreen is unavailable in this browser. The screen still fits your display.";
    return;
  }
  try {
    await document.documentElement.requestFullscreen();
    fullscreenNote.textContent = "";
  } catch {
    fullscreenNote.textContent =
      "Fullscreen was blocked. You can keep playing in this view.";
  }
}
fullscreenButton.addEventListener("click", async () => {
  if (document.fullscreenElement) {
    try {
      await document.exitFullscreen();
    } catch {
      /* Keep the responsive view. */
    }
  } else await enterFullscreen();
});
document.addEventListener("fullscreenchange", () => {
  const label = document.fullscreenElement
    ? "Exit fullscreen"
    : "Enter fullscreen";
  fullscreenButton.setAttribute("aria-label", label);
  fullscreenButton.title = label;
});

/* ============================================================
   UPGRADE 2 — WELCOME SCREEN + ADMIN LOGIN + PLAYER INFO PANEL
   ============================================================
   The loading screen stays the entry point. The Welcome screen only appears
   when CONTINUE is pressed, and BACK returns to the completed loading screen.
   No other screen, dashboard or registration flow exists. */

const ADMIN_ERROR_MESSAGE =
  "Please enter your correct password or username before you can access.";
const ADMIN_SUCCESS_MESSAGE = "Your password is correct!";

const continueButton = document.querySelector("#continue");
const openAdminButton = document.querySelector("#open-admin");
const openPlayerButton = document.querySelector("#open-player");
const backToLoadingButton = document.querySelector("#back-to-loading");

const adminPanel = document.querySelector("#admin-panel");
const adminForm = document.querySelector("#admin-form");
const adminUsername = document.querySelector("#admin-username");
const adminPassword = document.querySelector("#admin-password");
const adminToggle = document.querySelector("#password-toggle");
const adminSubmit = document.querySelector("#admin-submit");
const adminMessage = document.querySelector("#admin-message");
const adminBack = document.querySelector("#admin-back");

const constructionPanel = document.querySelector("#construction-panel");
const constructionClose = document.querySelector("#construction-close");

let adminChecking = false;
let adminVerified = false;
/* Increments on every attempt and every close, so a verification that is
   still in flight can never write into a panel the user has left. */
let adminAttempt = 0;

/* ---------- Screen switching ---------- */
function showScreen(target) {
  const showWelcome = target === "welcome";
  loadingScreen.hidden = showWelcome;
  loadingScreen.classList.toggle("is-active", !showWelcome);
  welcomeScreen.hidden = !showWelcome;
  welcomeScreen.classList.toggle("is-active", showWelcome);
  document.body.dataset.screen = showWelcome ? "welcome" : "loading";
  const heading = welcomeScreen.querySelector("h1");
  if (showWelcome && heading) heading.focus({ preventScroll: true });
}

/* CONTINUE is the only way into the Welcome screen. */
continueButton.addEventListener("click", () => {
  showScreen("welcome");
});

/* BACK returns to the existing loading screen, still showing CONTINUE. */
backToLoadingButton.addEventListener("click", () => {
  closeAdminPanel();
  if (constructionPanel.open) constructionPanel.close();
  showScreen("loading");
  continueButton.focus({ preventScroll: true });
});

/* ---------- Admin login panel ---------- */
function clearAdminMessage() {
  adminMessage.textContent = "";
  delete adminMessage.dataset.tone;
}

function setAdminMessage(text, tone) {
  adminMessage.textContent = text;
  adminMessage.dataset.tone = tone;
}

function lockAdminForm(locked) {
  adminChecking = locked;
  adminSubmit.disabled = locked || adminVerified;
  adminSubmit.textContent = locked ? "VERIFYING…" : "VERIFY ADMIN LOGIN";
  adminUsername.disabled = locked || adminVerified;
  adminPassword.disabled = locked || adminVerified;
  adminToggle.disabled = locked || adminVerified;
}

function resetAdminForm() {
  adminPassword.value = "";
  adminPassword.type = "password";
  adminToggle.setAttribute("aria-pressed", "false");
  adminToggle.setAttribute("aria-label", "Show password");
  adminToggle.title = "Show password";
  clearAdminMessage();
}

function closeAdminPanel() {
  adminAttempt += 1;
  adminChecking = false;
  if (adminPanel.open) adminPanel.close();
}

function openAdminPanel() {
  if (!adminVerified) {
    adminUsername.disabled = false;
    adminPassword.disabled = false;
    adminToggle.disabled = false;
    adminSubmit.disabled = false;
    adminSubmit.textContent = "VERIFY ADMIN LOGIN";
  }
  if (typeof adminPanel.showModal === "function") adminPanel.showModal();
  else adminPanel.setAttribute("open", "");
  if (adminVerified) adminSubmit.focus({ preventScroll: true });
  else adminUsername.focus({ preventScroll: true });
}

openAdminButton.addEventListener("click", openAdminPanel);

adminBack.addEventListener("click", () => {
  // Closing always works, even mid-verification; the in-flight result is
  // discarded by the attempt token inside closeAdminPanel().
  if (!adminVerified) resetAdminForm();
  closeAdminPanel();
  openAdminButton.focus({ preventScroll: true });
});

adminPanel.addEventListener("close", () => {
  if (!adminVerified) resetAdminForm();
});

adminToggle.addEventListener("click", () => {
  const revealed = adminToggle.getAttribute("aria-pressed") === "true";
  adminPassword.type = revealed ? "password" : "text";
  adminToggle.setAttribute("aria-pressed", String(!revealed));
  const label = revealed ? "Show password" : "Hide password";
  adminToggle.setAttribute("aria-label", label);
  adminToggle.title = label;
  adminPassword.focus({ preventScroll: true });
});

/* Field edits clear the previous outcome so the message never goes stale. */
[adminUsername, adminPassword].forEach((input) => {
  input.addEventListener("input", () => {
    if (!adminChecking && !adminVerified) clearAdminMessage();
  });
});

/* ---------- Credential verification ---------- */
function base64ToBytes(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function bytesToBase64(bytes) {
  let binary = "";
  const view = new Uint8Array(bytes);
  for (let index = 0; index < view.length; index += 1) {
    binary += String.fromCharCode(view[index]);
  }
  return btoa(binary);
}

/* Constant-time comparison so the check does not leak how much matched. */
function equalVerifier(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) {
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return diff === 0;
}

/* Compares a PBKDF2 verifier derived from the typed credentials against the
   one-way verifier in auth-config.js. Nothing is stored, and neither the
   username nor the password is present in the source. */
async function verifyAdminCredentials(username, password) {
  const config = window.PG_ADMIN_AUTH;
  const subtle = window.crypto && window.crypto.subtle;
  if (!config || config.algorithm !== "PBKDF2-SHA256" || !subtle) {
    return "unavailable";
  }
  try {
    const encoder = new TextEncoder();
    const keyMaterial = await subtle.importKey(
      "raw",
      encoder.encode(`${username}\u0000${password}`),
      "PBKDF2",
      false,
      ["deriveBits"],
    );
    const bits = await subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: base64ToBytes(config.salt),
        iterations: config.iterations,
        hash: "SHA-256",
      },
      keyMaterial,
      256,
    );
    return equalVerifier(bytesToBase64(bits), config.verifier)
      ? "valid"
      : "invalid";
  } catch {
    return "unavailable";
  }
}

adminForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  // Ignore repeat submissions while a check is running or already passed.
  if (adminChecking || adminVerified) return;

  const username = adminUsername.value.trim();
  const password = adminPassword.value;
  clearAdminMessage();

  if (!username || !password) {
    setAdminMessage(ADMIN_ERROR_MESSAGE, "error");
    (username ? adminPassword : adminUsername).focus({ preventScroll: true });
    return;
  }

  const attempt = ++adminAttempt;
  lockAdminForm(true);
  setAdminMessage("Verifying credentials…", "pending");
  const outcome = await verifyAdminCredentials(username, password);
  // The panel was closed while this check was running: drop the result.
  if (attempt !== adminAttempt) return;

  if (outcome === "valid") {
    adminVerified = true;
    adminPassword.value = "";
    adminPassword.type = "password";
    adminToggle.setAttribute("aria-pressed", "false");
    adminToggle.setAttribute("aria-label", "Show password");
    adminToggle.title = "Show password";
    // Keeps the fields locked so the verified state cannot be resubmitted.
    lockAdminForm(false);
    // Stays on this panel: navigation to the Home screen is Upgrade 3.
    setAdminMessage(ADMIN_SUCCESS_MESSAGE, "success");
    adminBack.focus({ preventScroll: true });
    announcement.textContent =
      "Administrator verified. Your password is correct!";
    return;
  }

  lockAdminForm(false);

  if (outcome === "invalid") {
    setAdminMessage(ADMIN_ERROR_MESSAGE, "error");
    adminPassword.value = "";
    adminPassword.focus({ preventScroll: true });
    return;
  }

  setAdminMessage(
    "Verification is unavailable because this page is not running in a secure browser context.",
    "error",
  );
});

/* ---------- Join as a player — information panel only ---------- */
openPlayerButton.addEventListener("click", () => {
  if (typeof constructionPanel.showModal === "function") {
    constructionPanel.showModal();
  } else {
    constructionPanel.setAttribute("open", "");
  }
  constructionClose.focus({ preventScroll: true });
});

constructionClose.addEventListener("click", () => {
  constructionPanel.close();
  openPlayerButton.focus({ preventScroll: true });
});

document.body.dataset.screen = "loading";

// Cache the small, dependency-free app for later offline visits.
if ("serviceWorker" in navigator && window.isSecureContext) {
  navigator.serviceWorker.register("./sw.js").catch(() => {
    // Local-file use and restricted browser contexts still work without caching.
  });
}
