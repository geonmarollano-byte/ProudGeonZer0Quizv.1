"use strict";

const percentage = document.querySelector("#percentage");
const progress = document.querySelector("#progress");
const fill = document.querySelector("#progress-fill");
const announcement = document.querySelector("#announcement");
const fullscreenButton = document.querySelector("#fullscreen");
const fullscreenNote = document.querySelector("#fullscreen-note");
const dialog = document.querySelector("#coming-soon");

// This is an intentional intro, not simulated network activity. All assets are local.
// Start after local assets finish, then use elapsed time (not queued timers).
function startIntro() {
  const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? 500
    : 3600;
  const started = performance.now();
  let lastValue = 1;
  function frame(now) {
    const value = Math.min(
      100,
      1 + Math.floor(((now - started) / duration) * 99),
    );
    if (value !== lastValue) {
      percentage.textContent = String(value);
      progress.setAttribute("aria-valuenow", String(value));
      fill.style.width = `${value}%`;
      lastValue = value;
    }
    if (value < 100) {
      window.setTimeout(() => frame(performance.now()), 32);
    } else {
      // Let 100% paint once before replacing the progress UI.
      window.setTimeout(() => {
        document.querySelector("#loading-panel").hidden = true;
        document.querySelector("#ready-panel").hidden = false;
        announcement.textContent = "Loading complete. Continue is ready.";
      }, 180);
    }
  }
  window.setTimeout(() => frame(performance.now()), 32);
}
if (document.readyState === "complete") startIntro();
else window.addEventListener("load", startIntro, { once: true });

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
// Only the loading screen is in scope. Give Continue an honest, reversible endpoint.
document
  .querySelector("#continue")
  .addEventListener("click", () => dialog.showModal());
document
  .querySelector("#close-dialog")
  .addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  // Dialog padding belongs to the dialog too; only dismiss actual backdrop taps.
  const bounds = dialog.getBoundingClientRect();
  const outside =
    event.clientX < bounds.left ||
    event.clientX > bounds.right ||
    event.clientY < bounds.top ||
    event.clientY > bounds.bottom;
  if (event.target === dialog && outside) dialog.close();
});

// Cache the small, dependency-free app for later offline visits.
if ("serviceWorker" in navigator && window.isSecureContext) {
  navigator.serviceWorker.register("./sw.js").catch(() => {
    // Local-file use and restricted browser contexts still work without caching.
  });
}
