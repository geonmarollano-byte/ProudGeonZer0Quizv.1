const { test, expect } = require("@playwright/test");

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 393, height: 851 },
  { width: 360, height: 640 },
  { width: 320, height: 568 },
  { width: 851, height: 393 },
]) {
  test(`loading and continue at ${viewport.width}x${viewport.height}`, async ({
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
    await expect(page.getByRole("button", { name: "CONTINUE" })).toBeVisible({
      timeout: 30000,
    });
    await expect(page.locator("#progress")).toHaveAttribute(
      "aria-valuenow",
      "100",
    );
    await expect(page.getByRole("progressbar")).toBeHidden();
    const dimensions = await page.evaluate(() => ({
      width: innerWidth,
      height: innerHeight,
      contentWidth: document.documentElement.scrollWidth,
      contentHeight: document.documentElement.scrollHeight,
    }));
    expect(dimensions.contentWidth).toBeLessThanOrEqual(dimensions.width);
    expect(dimensions.contentHeight).toBeLessThanOrEqual(dimensions.height);
    await page.getByRole("button", { name: "CONTINUE" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "BACK TO START" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
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
  await expect(page.getByRole("button", { name: "CONTINUE" })).toBeVisible({
    timeout: 30000,
  });
});

test("reduced motion and keyboard navigation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "CONTINUE" })).toBeVisible({
    timeout: 2500,
  });
  await page.getByRole("button", { name: "CONTINUE" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByRole("button", { name: "CONTINUE" })).toBeFocused();
});

test("dialog padding does not dismiss it but backdrop does", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "CONTINUE" }).click();
  const modal = page.getByRole("dialog");
  const box = await modal.boundingBox();
  await page.mouse.click(box.x + 10, box.y + 10);
  await expect(modal).toBeVisible();
  await page.mouse.click(5, 5);
  await expect(modal).toBeHidden();
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
    await expect(page.getByRole("button", { name: "CONTINUE" })).toBeVisible({
      timeout: 10000,
    });
  }
});

for (const mode of ["unsupported", "rejected"]) {
  test(`fullscreen ${mode} shows fallback without breaking Continue`, async ({
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
    await page.getByRole("button", { name: "CONTINUE" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });
}
