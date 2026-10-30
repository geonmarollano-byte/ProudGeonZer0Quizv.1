const { test, expect } = require("@playwright/test");

/* Upgrade 1 regression suite: the loading screen must behave exactly as it
   did before Upgrade 2, and must now hand over to the Welcome screen. */

async function waitForWelcome(page) {
  await expect(page.locator("#screen-welcome")).toBeVisible({ timeout: 30000 });
}

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 1280, height: 800 },
  { width: 800, height: 600 },
  { width: 393, height: 851 },
  { width: 320, height: 480 },
  { width: 360, height: 640 },
  { width: 320, height: 568 },
  { width: 851, height: 393 },
]) {
  test(`loading screen at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const remote = [];
    page.on("request", (request) => {
      if (!request.url().startsWith("http://127.0.0.1:3000"))
        remote.push(request.url());
    });
    await page.goto("/");

    // --- Loading screen (Upgrade 1) is unchanged -----------------------
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "PROUDGEONZER0QUIZV.1",
    );
    await expect(page.getByRole("progressbar")).toBeVisible();
    await expect(page.locator("#percentage")).not.toHaveText("0");
    await expect(page.locator(".orbit-one")).toHaveCSS(
      "animation-name",
      "energy-spin",
    );
    await expect(page.locator(".emblem")).toHaveCSS(
      "animation-name",
      "emblem-float",
    );
    const loading = await page.evaluate(() => ({
      width: innerWidth,
      height: innerHeight,
      contentWidth: document.documentElement.scrollWidth,
      contentHeight: document.documentElement.scrollHeight,
    }));
    expect(loading.contentWidth).toBeLessThanOrEqual(loading.width);
    expect(loading.contentHeight).toBeLessThanOrEqual(loading.height);

    // --- 100% then hand-off to Welcome ---------------------------------
    await expect(page.locator("#progress")).toHaveAttribute(
      "aria-valuenow",
      "100",
      { timeout: 30000 },
    );
    await waitForWelcome(page);
    await expect(page.locator("#percentage")).toHaveText("100");
    await expect(page.locator("#screen-loading")).toBeHidden();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "WELCOME TO THE NEXT LEVEL.",
    );
    await expect(
      page.getByRole("button", { name: "ADMIN LOGIN" }),
    ).toBeVisible();

    const welcome = await page.evaluate(() => ({
      width: innerWidth,
      height: innerHeight,
      contentWidth: document.documentElement.scrollWidth,
      contentHeight: document.documentElement.scrollHeight,
      screen: document.body.dataset.screen,
    }));
    expect(welcome.contentWidth).toBeLessThanOrEqual(welcome.width);
    expect(welcome.contentHeight).toBeLessThanOrEqual(welcome.height);
    expect(welcome.screen).toBe("welcome");

    expect(errors).toEqual([]);
    expect(remote).toEqual([]);
    if (viewport.width === 393)
      await page.screenshot({
        path: test.info().outputPath("mobile-preview.png"),
        fullPage: true,
      });
    if (viewport.width === 1440)
      await page.screenshot({
        path: test.info().outputPath("desktop-preview.png"),
        fullPage: true,
      });
  });
}

test("only the three authorised screens exist in the document", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  const structure = await page.evaluate(() => ({
    screens: [...document.querySelectorAll(".app > .screen")].map(
      (node) => node.id,
    ),
    dialogs: document.querySelectorAll("dialog").length,
    navs: document.querySelectorAll("nav").length,
    forms: document.querySelectorAll("form").length,
  }));
  expect(structure.screens).toEqual([
    "screen-loading",
    "screen-welcome",
    "screen-login",
  ]);
  expect(structure.dialogs).toBe(0);
  expect(structure.navs).toBe(0);
  expect(structure.forms).toBe(1);
});

test("cached app works with network offline", async ({ page, context }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise((resolve) =>
        navigator.serviceWorker.addEventListener("controllerchange", resolve, {
          once: true,
        }),
      );
  });
  await context.setOffline(true);
  await page.reload();
  await waitForWelcome(page);
  await expect(
    page.getByRole("button", { name: "ADMIN LOGIN" }),
  ).toBeVisible();
});

test("reduced motion shortens the intro and the hand-off", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("#screen-welcome")).toBeVisible({ timeout: 8000 });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "WELCOME TO THE NEXT LEVEL.",
  );
});

test("offline launch supports query strings and index.html", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise((resolve) =>
        navigator.serviceWorker.addEventListener("controllerchange", resolve, {
          once: true,
        }),
      );
    }
  });
  await context.setOffline(true);
  for (const path of ["/?source=shared", "/index.html?source=shared"]) {
    await page.goto(path);
    await expect(page.locator("#screen-welcome")).toBeVisible({
      timeout: 15000,
    });
  }
});

for (const mode of ["unsupported", "rejected"]) {
  test(`fullscreen ${mode} shows a fallback and keeps loading`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.addInitScript((mode) => {
      Object.defineProperty(document, "fullscreenEnabled", {
        get: () => mode !== "unsupported",
      });
      Element.prototype.requestFullscreen = () =>
        Promise.reject(new Error("Denied"));
    }, mode);
    await page.goto("/");
    await page.getByRole("button", { name: "Enter fullscreen" }).click();
    await expect(page.locator("#fullscreen-note")).not.toBeEmpty();
    await expect(page.getByRole("progressbar")).toBeVisible();
  });
}

test("game effects animate during loading", async ({ page }) => {
  await page.goto("/");
  const orbit = page.locator(".orbit-one");
  await expect(orbit).toHaveCSS("animation-name", "energy-spin");
  const before = await orbit.evaluate((el) => getComputedStyle(el).transform);
  await expect
    .poll(() => orbit.evaluate((el) => getComputedStyle(el).transform))
    .not.toBe(before);
});

test("progress bar advances continuously without stepping", async ({
  page,
}) => {
  await page.goto("/");

  // The bar must be driven every animation frame, not restarted transitions.
  const transition = await page
    .locator("#progress-fill")
    .evaluate((node) => getComputedStyle(node).transitionDuration);
  expect(transition).toBe("0s");

  const samples = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const bar = document.querySelector("#progress-fill");
        const values = [];
        const started = performance.now();
        function tick(now) {
          values.push({ width: bar.getBoundingClientRect().width, at: now });
          if (now - started < 900) requestAnimationFrame(tick);
          else resolve(values);
        }
        requestAnimationFrame(tick);
      }),
  );

  expect(samples.length).toBeGreaterThan(15);
  for (let index = 1; index < samples.length; index += 1) {
    expect(samples[index].width).toBeGreaterThanOrEqual(samples[index - 1].width);
  }
  expect(
    new Set(samples.map((sample) => sample.width.toFixed(2))).size,
  ).toBeGreaterThan(15);

  const width = await page
    .locator("#progress")
    .evaluate((node) => node.getBoundingClientRect().width);
  const fastSteps = [];
  for (let index = 1; index < samples.length; index += 1) {
    const gap = samples[index].at - samples[index - 1].at;
    if (gap > 0 && gap < 45) {
      fastSteps.push(samples[index].width - samples[index - 1].width);
    }
  }
  if (fastSteps.length >= 5) {
    const biggestJump = Math.max(...fastSteps);
    expect(biggestJump).toBeLessThan(width * 0.08);
  }
});

test("sound toggle mutes, unmutes and remembers the choice", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");

  const toggle = page.getByRole("button", { name: "Mute sound" });
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await toggle.click();

  const muted = page.getByRole("button", { name: "Unmute sound" });
  await expect(muted).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator("#sound-hint")).toContainText("SOUND IS OFF");
  expect(
    await page.evaluate(() =>
      window.localStorage.getItem("proudgeon-loading.sound.v1"),
    ),
  ).toBe("off");

  await page.reload();
  // The muted preference survives a reload.
  await expect(
    page.getByRole("button", { name: "Unmute sound" }),
  ).toHaveAttribute("aria-pressed", "false");

  await page.getByRole("button", { name: "Unmute sound" }).click();
  await expect(page.getByRole("button", { name: "Mute sound" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(
    await page.evaluate(() =>
      window.localStorage.getItem("proudgeon-loading.sound.v1"),
    ),
  ).toBe("on");
  expect(errors).toEqual([]);
});

test("loading still finishes when Web Audio is unavailable", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    delete window.AudioContext;
    delete window.webkitAudioContext;
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  await page.getByRole("button", { name: "Mute sound" }).click();
  await page.getByRole("button", { name: "Unmute sound" }).click();
  await expect(page.locator("#screen-welcome")).toBeVisible({ timeout: 8000 });
  // Only the non-sensitive sound preference may be persisted.
  const stored = await page.evaluate(() =>
    Object.keys(window.localStorage),
  );
  expect(stored.every((key) => key.startsWith("proudgeon-loading.sound"))).toBe(
    true,
  );
  expect(errors).toEqual([]);
});
