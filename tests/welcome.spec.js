const { test, expect } = require("@playwright/test");

async function goToWelcome(page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  // A fresh browser profile opens straight on the player card screen.
  await expect(page.locator("#welcome-screen")).toBeVisible();
  await expect(page.locator("#home-screen")).toBeHidden();
}

test("welcome screen is the player card setup only, with proceed at the bottom", async ({
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
  await expect(page.getByLabel(/What should we call you/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Dragon avatar" })).toBeVisible();
  await expect(
    page.getByRole("radio", { name: /Brave Challenger/ }),
  ).toBeVisible();

  // The removed intro screen leaves no trace.
  await expect(page.locator("#loading-screen")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /CONTINUE/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /REPLAY INTRO/ })).toHaveCount(
    0,
  );

  // Home-screen details stay on the home screen.
  await expect(page.locator("#warmup-question")).toBeHidden();
  await expect(page.locator("#fun-fact")).toBeHidden();
  await expect(page.locator("#badge-list")).toBeHidden();
  await expect(page.locator("#home-title")).toBeHidden();

  const proceed = page.getByRole("button", { name: /PROCEED/ });
  await expect(proceed).toBeVisible();
  const viewport = page.viewportSize();
  const box = await proceed.boundingBox();
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
  expect(box.y + box.height).toBeGreaterThan(viewport.height - 140);

  // The welcome screen fills the viewport without page overflow.
  const dimensions = await page.evaluate(() => ({
    width: innerWidth,
    height: innerHeight,
    contentWidth: document.documentElement.scrollWidth,
    welcomeHeight: document
      .querySelector("#welcome-screen")
      .getBoundingClientRect().height,
  }));
  expect(dimensions.contentWidth).toBeLessThanOrEqual(dimensions.width);
  expect(dimensions.welcomeHeight).toBe(dimensions.height);
  expect(errors).toEqual([]);
});

test("player card updates the greeting, avatar, style and topics", async ({
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
});

test("proceed opens the home screen with the same player", async ({ page }) => {
  await goToWelcome(page);
  await page.getByLabel(/What should we call you/).fill("Geon");
  await page.getByRole("button", { name: "Dragon avatar" }).click();
  await page.getByRole("radio", { name: /Legendary Mastermind/ }).click();
  await page.getByRole("button", { name: /PROCEED/ }).click();

  await expect(page.locator("#home-screen")).toBeVisible();
  await expect(page.locator("#welcome-screen")).toBeHidden();
  await expect(
    page.getByRole("heading", { name: /Kumusta ulit, Geon/ }),
  ).toBeVisible();
  await expect(page.locator("#home-avatar")).toHaveText("🐲");
  await expect(page.locator("#home-style")).toHaveText("Legendary Mastermind");
  // The setup fields belong to the welcome screen only.
  await expect(page.getByLabel(/What should we call you/)).toBeHidden();
});

test("player card is remembered after a reload", async ({ page }) => {
  await goToWelcome(page);
  await page.getByLabel(/What should we call you/).fill("ProudPlayer");
  await page.getByRole("button", { name: "Owl avatar" }).click();
  await page.reload();
  // Type-only changes are not a finished profile, so the card screen stays first.
  await expect(
    page.getByRole("heading", { name: /Kumusta, ProudPlayer/ }),
  ).toBeVisible();
  await expect(page.getByLabel(/What should we call you/)).toHaveValue(
    "ProudPlayer",
  );
  await expect(page.locator("#hero-avatar")).toHaveText("🦉");
  await page.getByRole("button", { name: /PROCEED/ }).click();
  await expect(
    page.getByRole("heading", { name: /Kumusta ulit, ProudPlayer/ }),
  ).toBeVisible();
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
