const { test, expect } = require("@playwright/test");

const ANSWERS = {
  capital: "Manila",
  "Red Planet": "Mars",
  "7 × 8": "56",
  "chemical formula": "H₂O",
  "plants absorb": "Carbon dioxide",
  "largest ocean": "Pacific Ocean",
};

async function goToHome(page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  // Fresh player: the game opens on the player card screen first.
  await expect(page.locator("#welcome-screen")).toBeVisible();
  await page.getByRole("button", { name: /PROCEED/ }).click();
  await expect(page.locator("#home-screen")).toBeVisible();
  await expect(page.locator("#welcome-screen")).toBeHidden();
}

async function solveCurrentWarmup(page) {
  const question = await page.locator("#warmup-question").textContent();
  const key = Object.keys(ANSWERS).find((needle) => question.includes(needle));
  if (!key) throw new Error(`Unknown warm-up question: ${question}`);
  await page.getByRole("button", { name: ANSWERS[key], exact: true }).click();
}

test("home screen holds its own quest hub details", async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 851 });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await goToHome(page);

  await expect(
    page.getByRole("heading", { name: /Kumusta ulit, Challenger/ }),
  ).toBeVisible();
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
  // Player setup stays on the welcome screen.
  await expect(page.getByLabel(/What should we call you/)).toBeHidden();
  await expect(page.locator("#topic-summary")).toBeHidden();

  const start = page.getByRole("button", { name: /START QUIZ/ });
  await expect(start).toBeVisible();
  const viewport = page.viewportSize();
  const box = await start.boundingBox();
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
  expect(box.y + box.height).toBeGreaterThan(viewport.height - 140);

  const dimensions = await page.evaluate(() => ({
    width: innerWidth,
    contentWidth: document.documentElement.scrollWidth,
    homeHeight: document
      .querySelector("#home-screen")
      .getBoundingClientRect().height,
    height: innerHeight,
  }));
  expect(dimensions.contentWidth).toBeLessThanOrEqual(dimensions.width);
  expect(dimensions.homeHeight).toBe(dimensions.height);
  expect(errors).toEqual([]);
});

test("warm-up rewards a correct answer and lets a wrong one retry", async ({
  page,
}) => {
  await goToHome(page);
  await expect(page.locator("#warmup-question")).toContainText("capital");

  await page.getByRole("button", { name: "Cebu City" }).click();
  await expect(page.locator("#warmup-feedback")).toContainText("Almost");
  await expect(page.locator("#xp-value")).toHaveText("0");

  await page.getByRole("button", { name: "Manila" }).click();
  await expect(page.locator("#warmup-feedback")).toContainText("+10 XP");
  await expect(page.locator("#xp-value")).toHaveText("10");
  await expect(page.locator("#coin-count")).toHaveText("5");
  await expect(page.locator("#daily-count")).toContainText("1 / 5");
  await expect(
    page.getByRole("button", { name: /NEW QUESTION/ }),
  ).toBeVisible();

  await page.getByRole("button", { name: /NEW QUESTION/ }).click();
  await expect(page.locator("#warmup-feedback")).toBeEmpty();
  await expect(page.locator("#warmup-question")).not.toContainText("capital");
});

test("solving five warm-ups completes the daily quest and unlocks badges", async ({
  page,
}) => {
  await goToHome(page);
  await solveCurrentWarmup(page);
  await expect(page.locator("#xp-value")).toHaveText("10");
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
  await expect(page.locator('.badge[data-badge="first-steps"]')).toHaveClass(
    /is-earned/,
  );
  await expect(page.locator('.badge[data-badge="brain-spark"]')).toHaveClass(
    /is-earned/,
  );
  await expect(page.locator('.badge[data-badge="quest-master"]')).toHaveClass(
    /is-earned/,
  );
  await expect(page.locator("#home-summary-sub")).toContainText(
    "Quest complete",
  );
});

test("fun fact shuffle always shows a different fact", async ({ page }) => {
  await goToHome(page);
  const before = await page.locator("#fun-fact").textContent();
  expect(before.trim().length).toBeGreaterThan(20);
  await page.getByRole("button", { name: /SHUFFLE A FUN FACT/ }).click();
  const after = await page.locator("#fun-fact").textContent();
  expect(after).not.toBe(before);
});

test("home navigation returns to the welcome screen", async ({ page }) => {
  await goToHome(page);
  await page.getByRole("button", { name: "Back to welcome screen" }).click();
  await expect(page.locator("#welcome-screen")).toBeVisible();
  await expect(page.locator("#home-screen")).toBeHidden();
  await expect(
    page.getByRole("heading", { name: /Create Your Player Card/ }),
  ).toBeVisible();
});

test("edit player card returns to welcome and then home again", async ({
  page,
}) => {
  await goToHome(page);
  await page.getByRole("button", { name: /EDIT PLAYER CARD/ }).click();
  await expect(page.locator("#welcome-screen")).toBeVisible();
  await page.getByLabel(/What should we call you/).fill("Geon");
  await page.getByRole("button", { name: /PROCEED/ }).click();
  await expect(
    page.getByRole("heading", { name: /Kumusta ulit, Geon/ }),
  ).toBeVisible();
});

test("start quiz opens a dialog and returns to home", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("#welcome-screen")).toBeVisible();
  await page.getByLabel(/What should we call you/).fill("Geon");
  await page.getByRole("button", { name: /PROCEED/ }).click();
  await page.getByRole("button", { name: /START QUIZ/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Geon");
  await page.getByRole("button", { name: "BACK TO HOME" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator("#home-screen")).toBeVisible();
});

test("dialog padding does not dismiss it but backdrop does", async ({
  page,
}) => {
  await goToHome(page);
  await page.getByRole("button", { name: /START QUIZ/ }).click();
  const modal = page.getByRole("dialog");
  const box = await modal.boundingBox();
  await page.mouse.click(box.x + 10, box.y + 10);
  await expect(modal).toBeVisible();
  await page.mouse.click(5, 5);
  await expect(modal).toBeHidden();
});

test("home progress is remembered after a reload", async ({ page }) => {
  await goToHome(page);
  await solveCurrentWarmup(page);
  await expect(page.locator("#xp-value")).toHaveText("10");
  await page.reload();
  // A returning player with a finished profile lands on the quest hub.
  await expect(page.locator("#home-screen")).toBeVisible();
  await expect(page.locator("#xp-value")).toHaveText("10");
  await expect(page.locator("#coin-count")).toHaveText("5");
  await expect(page.locator("#daily-count")).toContainText("1 / 5");
});

test("sound toggle updates state and survives a reload", async ({ page }) => {
  await goToHome(page);
  await page.getByRole("button", { name: "Turn sound off" }).click();
  await expect(
    page.getByRole("button", { name: "Turn sound on" }),
  ).toHaveAttribute("aria-pressed", "false");
  await page.reload();
  await expect(page.locator("#home-screen")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Turn sound on" }),
  ).toHaveAttribute("aria-pressed", "false");
});

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 360, height: 640 },
  { width: 320, height: 568 },
  { width: 851, height: 393 },
]) {
  test(`home screen fits and scrolls internally at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await goToHome(page);
    await expect(page.getByRole("button", { name: /START QUIZ/ })).toBeVisible();
    const state = await page.evaluate(() => {
      const scroller = document.querySelector("#home-scroll");
      scroller.scrollTop = scroller.scrollHeight;
      return {
        pageWidth: document.documentElement.scrollWidth,
        innerWidth,
        scrolled: scroller.scrollTop,
        canScroll: scroller.scrollHeight > scroller.clientHeight,
      };
    });
    expect(state.pageWidth).toBeLessThanOrEqual(state.innerWidth);
    // Content taller than the screen scrolls inside the home screen,
    // keeping START QUIZ pinned at the bottom.
    if (state.canScroll) expect(state.scrolled).toBeGreaterThan(0);
    await expect(page.getByRole("button", { name: /START QUIZ/ })).toBeVisible();
  });
}
