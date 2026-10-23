const { test, expect } = require("@playwright/test");

const STORAGE_KEY = "proudgeonzer0quiz.player.v1";

const savedProfile = {
  name: "Geon",
  avatar: "🐲",
  difficulty: "legendary",
  topics: ["Science", "Philippines"],
  xp: 20,
  coins: 10,
  sound: true,
  solved: ["capital-ph", "red-planet"],
  dailyRewardClaimed: false,
  profileComplete: true,
};

function seedProfile(state) {
  window.localStorage.setItem(
    "proudgeonzer0quiz.player.v1",
    JSON.stringify(state),
  );
}

async function openWelcome(page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "CONTINUE" })).toBeVisible({
    timeout: 15000,
  });
  await page.getByRole("button", { name: "CONTINUE" }).click();
  await expect(page.locator("#welcome-screen")).toBeVisible();
}

test("welcome screen shows the logo, tagline, description and one action", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const remote = [];
  page.on("request", (request) => {
    if (!request.url().startsWith("http://127.0.0.1:3000"))
      remote.push(request.url());
  });

  await openWelcome(page);

  await expect(page.locator("#welcome-title")).toContainText("PROUDGEON");
  await expect(page.locator("#welcome-title")).toContainText("ZER0QUIZ");
  await expect(page.locator(".intro-tagline")).toHaveText("THE MIND IS LIMITLESS");
  await expect(page.locator(".intro-desc")).toContainText(
    "Explore exciting quests, challenge your knowledge",
  );

  const action = page.getByRole("button", { name: "START YOUR ADVENTURE" });
  await expect(action).toBeVisible();

  // One clear primary action, no duplicated feature controls.
  await expect(page.locator("#welcome-screen button")).toHaveCount(3);
  await expect(page.locator("#welcome-screen button.start-adventure")).toHaveCount(
    1,
  );
  await expect(page.locator("#welcome-screen input")).toHaveCount(0);
  await expect(page.locator("#welcome-screen .topic-chip")).toHaveCount(0);
  await expect(page.locator("#welcome-screen [role='progressbar']")).toHaveCount(
    0,
  );

  expect(errors).toEqual([]);
  expect(remote).toEqual([]);
});

test("new player goes to the player card screen", async ({ page }) => {
  await openWelcome(page);
  await page.getByRole("button", { name: "START YOUR ADVENTURE" }).click();

  await expect(page.locator("#player-card-screen")).toBeVisible();
  await expect(page.locator("#welcome-screen")).toBeHidden();
  await expect(
    page.getByRole("heading", { name: /Create Your Player Card/ }),
  ).toBeVisible();

  // Player creation still works end to end.
  await page.getByLabel(/What should we call you/).fill("Geon");
  await expect(
    page.getByRole("heading", { name: /Kumusta, Geon/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: /PROCEED/ }).click();
  await expect(page.locator("#home-screen")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /Kumusta ulit, Geon/ }),
  ).toBeVisible();
});

test("returning player goes straight to the quest hub with data intact", async ({
  page,
}) => {
  await page.addInitScript(seedProfile, savedProfile);
  await openWelcome(page);

  await expect(page.locator("#welcome-footnote")).toContainText("WELCOME BACK");
  await page.getByRole("button", { name: "START YOUR ADVENTURE" }).click();

  await expect(page.locator("#home-screen")).toBeVisible();
  await expect(page.locator("#welcome-screen")).toBeHidden();
  await expect(page.locator("#player-card-screen")).toBeHidden();
  await expect(
    page.getByRole("heading", { name: /Kumusta ulit, Geon/ }),
  ).toBeVisible();
  await expect(page.locator("#home-avatar")).toHaveText("🐲");
  await expect(page.locator("#home-style")).toHaveText("Legendary Mastermind");
  await expect(page.locator("#xp-value")).toHaveText("20");
  await expect(page.locator("#coin-count")).toHaveText("10");
  await expect(page.locator("#daily-count")).toContainText("2 / 5");
  await expect(page.locator("#badge-count")).toHaveText("1 / 3");
});

test("legacy saves without the completion flag still count as returning", async ({
  page,
}) => {
  const legacy = { ...savedProfile };
  delete legacy.profileComplete;
  await page.addInitScript(seedProfile, legacy);
  await openWelcome(page);
  await page.getByRole("button", { name: "START YOUR ADVENTURE" }).click();
  await expect(page.locator("#home-screen")).toBeVisible();
  await expect(page.locator("#xp-value")).toHaveText("20");
});

test("start button cannot navigate twice on a double tap", async ({ page }) => {
  await openWelcome(page);
  const action = page.getByRole("button", { name: "START YOUR ADVENTURE" });
  await action.dblclick();

  await expect(page.locator("#player-card-screen")).toBeVisible();
  const state = await page.evaluate(() => ({
    visible: [...document.querySelectorAll("main")]
      .filter((node) => !node.hidden)
      .map((node) => node.id),
  }));
  expect(state.visible).toEqual(["player-card-screen"]);
});

test("back from the player card and quest hub still works", async ({
  page,
}) => {
  await openWelcome(page);
  await page.getByRole("button", { name: "START YOUR ADVENTURE" }).click();
  await expect(page.locator("#player-card-screen")).toBeVisible();

  await page.getByRole("button", { name: "Back to welcome screen" }).click();
  await expect(page.locator("#welcome-screen")).toBeVisible();

  await page.getByRole("button", { name: "START YOUR ADVENTURE" }).click();
  await page.getByRole("button", { name: /PROCEED/ }).click();
  await expect(page.locator("#home-screen")).toBeVisible();

  await page.getByRole("button", { name: "Back to player card" }).click();
  await expect(page.locator("#player-card-screen")).toBeVisible();

  await page.getByRole("button", { name: /EDIT PLAYER CARD/ }).count();
});

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 393, height: 851 },
  { width: 360, height: 640 },
  { width: 320, height: 568 },
  { width: 851, height: 393 },
]) {
  test(`welcome screen fits ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await openWelcome(page);

    const state = await page.evaluate(() => {
      const screen = document.querySelector("#welcome-screen");
      const button = document.querySelector("#start-adventure");
      const box = button.getBoundingClientRect();
      return {
        innerWidth,
        innerHeight,
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
        screenHeight: screen.getBoundingClientRect().height,
        buttonTop: box.top,
        buttonBottom: box.bottom,
        buttonHeight: box.height,
      };
    });

    expect(state.scrollWidth).toBeLessThanOrEqual(state.innerWidth);
    expect(state.scrollHeight).toBeLessThanOrEqual(state.innerHeight);
    expect(state.screenHeight).toBe(state.innerHeight);
    expect(state.buttonTop).toBeGreaterThanOrEqual(0);
    expect(state.buttonBottom).toBeLessThanOrEqual(state.innerHeight);
    // Comfortable touch target for Android.
    expect(state.buttonHeight).toBeGreaterThanOrEqual(44);
  });
}

test("reduced motion still shows the screen quickly", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "CONTINUE" })).toBeVisible({
    timeout: 8000,
  });
  await page.getByRole("button", { name: "CONTINUE" }).click();
  const action = page.getByRole("button", { name: "START YOUR ADVENTURE" });
  await expect(action).toBeVisible();
  const animation = await page
    .locator("#welcome-title")
    .evaluate((node) => getComputedStyle(node.closest(".intro-content")).opacity);
  expect(Number(animation)).toBe(1);
});

test("welcome screen is keyboard reachable", async ({ page }) => {
  await openWelcome(page);
  await page.getByRole("button", { name: "START YOUR ADVENTURE" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#player-card-screen")).toBeVisible();
});

test("visible focus ring on the primary action", async ({ page }) => {
  await openWelcome(page);
  await page.locator("#welcome-fullscreen").focus();
  await page.keyboard.press("Tab");
  const style = await page.locator("#start-adventure").evaluate((node) => {
    const cs = getComputedStyle(node);
    return {
      focused: document.activeElement === node,
      outlineWidth: parseFloat(cs.outlineWidth),
      outlineStyle: cs.outlineStyle,
      outlineColor: cs.outlineColor,
    };
  });
  expect(style.focused).toBe(true);
  expect(style.outlineStyle).not.toBe("none");
  expect(style.outlineWidth).toBeGreaterThanOrEqual(2);
});

test("welcome screen survives an orientation change", async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 851 });
  await openWelcome(page);
  await page.setViewportSize({ width: 851, height: 393 });
  await expect(
    page.getByRole("button", { name: "START YOUR ADVENTURE" }),
  ).toBeVisible();

  const state = await page.evaluate(() => {
    const button = document
      .querySelector("#start-adventure")
      .getBoundingClientRect();
    return {
      overflowX: document.documentElement.scrollWidth - innerWidth,
      overflowY: document.documentElement.scrollHeight - innerHeight,
      buttonBottom: button.bottom,
      innerHeight,
    };
  });
  expect(state.overflowX).toBeLessThanOrEqual(0);
  expect(state.overflowY).toBeLessThanOrEqual(0);
  expect(state.buttonBottom).toBeLessThanOrEqual(state.innerHeight);
});

test("entrance animation does not shift the primary action", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.__shifts = [];
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) window.__shifts.push(entry.value);
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "CONTINUE" }).click();
  await page.waitForTimeout(1200);
  const shifts = await page.evaluate(() => window.__shifts);
  expect(shifts.reduce((total, value) => total + value, 0)).toBeLessThan(0.05);
});
