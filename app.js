"use strict";

const percentage = document.querySelector("#percentage");
const progress = document.querySelector("#progress");
const fill = document.querySelector("#progress-fill");
const announcement = document.querySelector("#announcement");
const fullscreenButton = document.querySelector("#fullscreen");
const fullscreenNote = document.querySelector("#fullscreen-note");
const soundToggle = document.querySelector("#sound-toggle");
const soundHint = document.querySelector("#sound-hint");
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
  // The loading screen is the only interface: 100% simply holds in place.
  announcement.textContent = "Loading complete.";
  updateSoundHint();
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

// Cache the small, dependency-free app for later offline visits.
if ("serviceWorker" in navigator && window.isSecureContext) {
  navigator.serviceWorker.register("./sw.js").catch(() => {
    // Local-file use and restricted browser contexts still work without caching.
  });
}
