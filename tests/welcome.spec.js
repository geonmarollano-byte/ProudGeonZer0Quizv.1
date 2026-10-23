const { test, expect } = require("@playwright/test");

async function goToWelcome(page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "CONTINUE" }).click();
  await expect(page.locator("#welcome-screen")).toBeVisible();
  await expect(page.locator("#loading-screen")).toBeHidden();
}

test("welcome screen greets the player and proceed is at the bottom", async ({
  page,
}) => {
  await page.setViewportSize({ width: 393, height: 851 });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await goToWelcome(page);
  await expect(
    page.getByRole("heading", { name: /Kumusta, Challenger/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /Create Your Player Card/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /Warm-Up Challenge/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /Quest of the Day/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /Did You Know/ }),
  ).toBeVisible();
  const proceed = page.getByRole("button", { name: /PROCEED/ });
  await expect(proceed).toBeVisible();
  const viewport = page.viewportSize();
  const box = await proceed.boundingBox();
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
  expect(box.y + box.height).toBeGreaterThan(viewport.height - 140);
  // The welcome screen itself fills the viewport without page overflow.
  const dimensions = await page.evaluate(() => ({
    width: innerWidth,
    height: innerHeight,
    contentWidth: document.documentElement.scrollWidth,
    contentHeight: document.documentElement.scrollHeight,
    welcomeHeight: document
      .querySelector("#welcome-screen")
      .getBoundingClientRect().height,
  }));
  expect(dimensions.contentWidth).toBeLessThanOrEqual(dimensions.width);
  expect(dimensions.welcomeHeight).toBe(dimensions.height);
  expect(errors).toEqual([]);
});

test("player card updates the greeting, avatar, difficulty and topics", async ({
  page,
}) => {
  await goToWelcome(page);
  await page.getByLabel(/What should we call you/).fill("Geon");
  await expect(
    page.getByRole("heading", { name: /Kumusta, Geon/ }),
  ).toBeVisible();
  await expect(page.locator("#summary-text")).toContainText("Geon");
  await page.getByRole("button", { name: "Dragon avatar" }).click();
  await expect(page.locator("#hero-avatar")).toHaveText("🐲");
  await expect(page.locator("#summary-avatar")).toHaveText("🐲");
  await page.getByRole("radio", { name: /Legendary Mastermind/ }).click();
  await expect(
    page.getByRole("radio", { name: /Legendary Mastermind/ }),
  ).toHaveAttribute("aria-checked", "true");
  await expect(page.locator("#summary-text")).toContainText(
    "Legendary Mastermind",
  );
  await page.getByRole("button", { name: /Science/ }).click();
  await expect(page.locator("#topic-summary")).toContainText("Science");
  await page.getByRole("button", { name: /PROCEED/ }).click();
  await expect(page.getByRole("dialog")).toContainText("Geon");
  await expect(page.getByRole("dialog")).toContainText("Legendary Mastermind");
  await expect(page.getByRole("dialog")).toContainText("Science");
});

test("warm-up challenge rewards a correct answer and rejects a wrong one", async ({
  page,
}) => {
  await goToWelcome(page);
  // First warm-up question is always the Philippines capital question.
  await expect(page.locator("#warmup-question")).toContainText("capital");
  await page.getByRole("button", { name: "Cebu City" }).click();
  await expect(page.locator("#warmup-feedback")).toContainText("Almost");
  await expect(page.locator("#xp-value")).toHaveText("0");
  await page.getByRole("button", { name: "Manila" }).click();
  await expect(page.locator("#warmup-feedback")).toContainText("+10 XP");
  await expect(page.locator("#xp-value")).toHaveText("10");
  await expect(page.locator("#coin-count")).toHaveText("5");
  await expect(page.locator("#daily-count")).toContainText("1 / 5");
  await expect(page.getByRole("button", { name: /NEW QUESTION/ })).toBeVisible();
  await page.getByRole("button", { name: /NEW QUESTION/ }).click();
  await expect(page.locator("#warmup-feedback")).toBeEmpty();
});

test("fun fact shuffle always shows a different fact", async ({ page }) => {
  await goToWelcome(page);
  const before = await page.locator("#fun-fact").textContent();
  expect(before.trim().length).toBeGreaterThan(20);
  await page.getByRole("button", { name: /SHUFFLE A FUN FACT/ }).click();
  const after = await page.locator("#fun-fact").textContent();
  expect(after).not.toBe(before);
});

test("back button returns to the ready loading screen", async ({ page }) => {
  await goToWelcome(page);
  await page.getByRole("button", { name: "Back to loading screen" }).click();
  await expect(page.locator("#loading-screen")).toBeVisible();
  await expect(page.locator("#welcome-screen")).toBeHidden();
  await expect(page.getByRole("button", { name: "CONTINUE" })).toBeVisible();
  await expect(page.getByRole("button", { name: "CONTINUE" })).toBeFocused();
  // And the player can enter the welcome screen again.
  await page.getByRole("button", { name: "CONTINUE" }).click();
  await expect(page.locator("#welcome-screen")).toBeVisible();
});

test("player card is remembered after a reload", async ({ page }) => {
  await goToWelcome(page);
  await page.getByLabel(/What should we call you/).fill("ProudPlayer");
  await page.getByRole("button", { name: "Owl avatar" }).click();
  await page.getByRole("button", { name: "Manila" }).click();
  await expect(page.locator("#xp-value")).toHaveText("10");
  await page.reload();
  await page.getByRole("button", { name: "CONTINUE" }).click();
  await expect(
    page.getByRole("heading", { name: /Kumusta, ProudPlayer/ }),
  ).toBeVisible();
  await expect(page.getByLabel(/What should we call you/)).toHaveValue(
    "ProudPlayer",
  );
  await expect(page.locator("#hero-avatar")).toHaveText("🦉");
  await expect(page.locator("#xp-value")).toHaveText("10");
});

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 360, height: 640 },
  { width: 320, height: 568 },
  { width: 851, height: 393 },
]) {
  test(`welcome screen fits and scrolls internally at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await goToWelcome(page);
    await expect(page.getByRole("button", { name: /PROCEED/ })).toBeVisible();
    const state = await page.evaluate(() => {
      const scroller = document.querySelector("#welcome-scroll");
      scroller.scrollTop = scroller.scrollHeight;
      return {
        pageWidth: document.documentElement.scrollWidth,
        innerWidth,
        scrolled: scroller.scrollTop,
        canScroll: scroller.scrollHeight > scroller.clientHeight,
      };
    });
    expect(state.pageWidth).toBeLessThanOrEqual(state.innerWidth);
    // Content taller than the screen scrolls inside the welcome screen,
    // keeping PROCEED pinned at the bottom.
    if (state.canScroll) expect(state.scrolled).toBeGreaterThan(0);
    await expect(page.getByRole("button", { name: /PROCEED/ })).toBeVisible();
  });
}

test("quest style radio group works with arrow keys", async ({ page }) => {
  await goToWelcome(page);
  const brave = page.getByRole("radio", { name: /Brave Challenger/ });
  await brave.focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("radio", { name: /Legendary Mastermind/ }),
  ).toHaveAttribute("aria-checked", "true");
  await expect(
    page.getByRole("radio", { name: /Legendary Mastermind/ }),
  ).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(brave).toHaveAttribute("aria-checked", "true");
  await expect(brave).toBeFocused();
});

test("sound toggle updates state and survives a reload", async ({ page }) => {
  await goToWelcome(page);
  const toggle = page.getByRole("button", { name: "Turn sound off" });
  await toggle.click();
  const muted = page.getByRole("button", { name: "Turn sound on" });
  await expect(muted).toHaveAttribute("aria-pressed", "false");
  await page.reload();
  await page.getByRole("button", { name: "CONTINUE" }).click();
  await expect(
    page.getByRole("button", { name: "Turn sound on" }),
  ).toHaveAttribute("aria-pressed", "false");
});
