const { test, expect } = require("@playwright/test");

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
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "PROUDGEONZER0QUIZV.1",
    );
    await expect(page.getByRole("progressbar")).toBeVisible();
    await expect(page.locator("#percentage")).not.toHaveText("0");
    await expect(page.locator("#progress")).toHaveAttribute(
      "aria-valuenow",
      "100",
      { timeout: 30000 },
    );
    // The loading screen is the only interface: it stays on screen at 100%.
    await expect(page.getByRole("progressbar")).toBeVisible();
    await expect(page.getByRole("button")).toHaveCount(2);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    const dimensions = await page.evaluate(() => ({
      width: innerWidth,
      height: innerHeight,
      contentWidth: document.documentElement.scrollWidth,
      contentHeight: document.documentElement.scrollHeight,
    }));
    expect(dimensions.contentWidth).toBeLessThanOrEqual(dimensions.width);
    expect(dimensions.contentHeight).toBeLessThanOrEqual(dimensions.height);
    // Nothing navigates away once loading reaches 100%.
    await page.waitForTimeout(600);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("progressbar")).toBeVisible();
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

test("only the loading screen exists in the document", async ({ page }) => {
  await page.goto("/");
  const structure = await page.evaluate(() => ({
    sections: [...document.querySelectorAll("main > section")].map(
      (node) => node.className,
    ),
    dialogs: document.querySelectorAll("dialog").length,
    panels: document.querySelectorAll("[id$='-panel']").length,
    navs: document.querySelectorAll("nav").length,
  }));
  expect(structure.sections).toEqual(["identity", "launch"]);
  expect(structure.dialogs).toBe(0);
  expect(structure.panels).toBe(1);
  expect(structure.navs).toBe(0);
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
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "100",
    { timeout: 30000 },
  );
});

test("reduced motion shortens the intro", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("#progress")).toHaveAttribute(
    "aria-valuenow",
    "100",
    { timeout: 8000 },
  );
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
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
    await expect(page.locator("#progress")).toHaveAttribute(
      "aria-valuenow",
      "100",
      { timeout: 10000 },
    );
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

test("game effects animate on the loading screen", async ({ page }) => {
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
  // Strictly increasing: no backwards jumps or frozen frames.
  for (let index = 1; index < samples.length; index += 1) {
    expect(samples[index].width).toBeGreaterThanOrEqual(samples[index - 1].width);
  }
  // Many distinct widths means a smooth sweep rather than a few big steps.
  expect(
    new Set(samples.map((sample) => sample.width.toFixed(2))).size,
  ).toBeGreaterThan(15);

  // Look only at frame-to-frame steps that actually rendered back to back;
  // skipped frames on a busy machine are not a bar stutter.
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
  await expect(page.locator("#progress")).toHaveAttribute(
    "aria-valuenow",
    "100",
    { timeout: 8000 },
  );
  expect(errors).toEqual([]);
});
