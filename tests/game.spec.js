const { test, expect } = require("@playwright/test");

const ANSWERS = {
  capital: "Manila",
  "Red Planet": "Mars",
  "7 × 8": "56",
  "chemical formula": "H₂O",
  "plants absorb": "Carbon dioxide",
  "largest ocean": "Pacific Ocean",
};

async function goToPlayerCard(page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "CONTINUE" })).toBeVisible({
    timeout: 15000,
  });
  await page.getByRole("button", { name: "CONTINUE" }).click();
  await page.getByRole("button", { name: "START YOUR ADVENTURE" }).click();
  await expect(page.locator("#player-card-screen")).toBeVisible();
}

async function goToHome(page) {
  await goToPlayerCard(page);
  await page.getByRole("button", { name: /PROCEED/ }).click();
  await expect(page.locator("#home-screen")).toBeVisible();
}

async function solveCurrentWarmup(page) {
  const question = await page.locator("#warmup-question").textContent();
  const key = Object.keys(ANSWERS).find((needle) => question.includes(needle));
  if (!key) throw new Error(`Unknown warm-up question: ${question}`);
  await page.getByRole("button", { name: ANSWERS[key], exact: true }).click();
}

test("player card personalization updates preview and summary", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await goToPlayerCard(page);

  await page.getByLabel(/What should we call you/).fill("Geon");
  await expect(
    page.getByRole("heading", { name: /Kumusta, Geon/ }),
  ).toBeVisible();
  await expect(page.locator("#summary-text")).toContainText("Geon");

  await page.getByRole("button", { name: "Dragon avatar" }).click();
  await expect(page.locator("#hero-avatar")).toHaveText("🐲");
  await expect(page.locator("#summary-avatar")).toHaveText("🐲");

  await page.getByRole("radio", { name: /Legendary Mastermind/ }).click();
  await expect(page.locator("#summary-text")).toContainText(
    "Legendary Mastermind",
  );

  await page.getByRole("button", { name: /Science/ }).click();
  await expect(page.locator("#topic-summary")).toContainText("Science");
  expect(errors).toEqual([]);
});

test("quest style radio group supports arrow keys", async ({ page }) => {
  await goToPlayerCard(page);
  const brave = page.getByRole("radio", { name: /Brave Challenger/ });
  await brave.focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("radio", { name: /Legendary Mastermind/ }),
  ).toHaveAttribute("aria-checked", "true");
  await page.keyboard.press("ArrowLeft");
  await expect(brave).toHaveAttribute("aria-checked", "true");
});

test("quest hub holds its own details", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await goToHome(page);

  for (const heading of [
    /Warm-Up Challenge/,
    /Quest of the Day/,
    /Your Favorite Topics/,
    /Did You Know/,
    /Your Badges/,
    /How to Play/,
  ]) {
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  }
  await expect(page.getByRole("button", { name: /START QUIZ/ })).toBeVisible();
  // Player setup stays on the player card screen.
  await expect(page.getByLabel(/What should we call you/)).toBeHidden();
  expect(errors).toEqual([]);
});

test("warm-up rewards and daily quest still work", async ({ page }) => {
  await goToHome(page);
  await page.getByRole("button", { name: "Cebu City" }).click();
  await expect(page.locator("#warmup-feedback")).toContainText("Almost");
  await expect(page.locator("#xp-value")).toHaveText("0");

  await page.getByRole("button", { name: "Manila" }).click();
  await expect(page.locator("#xp-value")).toHaveText("10");
  await expect(page.locator("#coin-count")).toHaveText("5");
  await expect(page.locator("#daily-count")).toContainText("1 / 5");

  let coins = 5;
  for (let solved = 2; solved <= 5; solved += 1) {
    await page.getByRole("button", { name: /NEW QUESTION/ }).click();
    await solveCurrentWarmup(page);
    coins += 5;
    if (solved === 5) coins += 50;
    await expect(page.locator("#xp-value")).toHaveText(String(solved * 10));
    await expect(page.locator("#coin-count")).toHaveText(String(coins));
  }
  await expect(page.locator("#daily-count")).toContainText("QUEST COMPLETE");
  await expect(page.locator("#badge-count")).toHaveText("3 / 3");
});

test("fun fact shuffle and start quiz dialog still work", async ({ page }) => {
  await goToHome(page);
  const before = await page.locator("#fun-fact").textContent();
  await page.getByRole("button", { name: /SHUFFLE A FUN FACT/ }).click();
  expect(await page.locator("#fun-fact").textContent()).not.toBe(before);

  await page.getByRole("button", { name: /START QUIZ/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const box = await dialog.boundingBox();
  await page.mouse.click(box.x + 10, box.y + 10);
  await expect(dialog).toBeVisible();
  await page.mouse.click(5, 5);
  await expect(dialog).toBeHidden();
  await expect(page.locator("#home-screen")).toBeVisible();
});

test("progress and profile survive a reload", async ({ page }) => {
  await goToHome(page);
  await page.getByLabel(/What should we call you/).count();
  await solveCurrentWarmup(page);
  await expect(page.locator("#xp-value")).toHaveText("10");

  await page.reload();
  await page.getByRole("button", { name: "CONTINUE" }).click();
  await page.getByRole("button", { name: "START YOUR ADVENTURE" }).click();
  await expect(page.locator("#home-screen")).toBeVisible();
  await expect(page.locator("#xp-value")).toHaveText("10");
  await expect(page.locator("#coin-count")).toHaveText("5");
});

test("sound preference is shared across screens", async ({ page }) => {
  await goToHome(page);
  await page.getByRole("button", { name: "Mute sound" }).click();
  await expect(page.locator("#sound-toggle")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await page.getByRole("button", { name: "Back to player card" }).click();
  await expect(page.locator("#player-card-screen")).toBeVisible();
  await page.getByRole("button", { name: "Back to welcome screen" }).click();
  await expect(page.locator("#welcome-screen")).toBeVisible();
  await expect(page.locator("#welcome-sound")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});
