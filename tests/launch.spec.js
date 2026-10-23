const { test, expect } = require("@playwright/test");

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

test("launch opens the player card screen and no intro screen exists", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const remote = [];
  page.on("request", (request) => {
    if (!request.url().startsWith("http://127.0.0.1:3000"))
      remote.push(request.url());
  });

  await page.goto("/");

  await expect(page.locator("#welcome-screen")).toBeVisible();
  await expect(page.locator("#home-screen")).toBeHidden();
  await expect(
    page.getByRole("heading", { name: /Kumusta, Challenger/ }),
  ).toBeVisible();

  // The intro screen and its exclusive controls are gone.
  await expect(page.locator("#loading-screen")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /CONTINUE/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /REPLAY INTRO/ })).toHaveCount(
    0,
  );
  await expect(page.getByRole("progressbar", { name: "Loading game" })).toHaveCount(0);
  await expect(page.getByText("THE MIND IS LIMITLESS")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Back to loading/ })).toHaveCount(0);

  expect(errors).toEqual([]);
  expect(remote).toEqual([]);
});

test("returning player with a saved profile lands on the quest hub", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(seedProfile, savedProfile);
  await page.goto("/");

  await expect(page.locator("#home-screen")).toBeVisible();
  await expect(page.locator("#welcome-screen")).toBeHidden();
  await expect(
    page.getByRole("heading", { name: /Kumusta ulit, Geon/ }),
  ).toBeVisible();

  // Saved player data is intact, not reset.
  await expect(page.locator("#home-avatar")).toHaveText("🐲");
  await expect(page.locator("#home-style")).toHaveText("Legendary Mastermind");
  await expect(page.locator("#xp-value")).toHaveText("20");
  await expect(page.locator("#coin-count")).toHaveText("10");
  await expect(page.locator("#daily-count")).toContainText("2 / 5");
  await expect(page.locator("#badge-count")).toHaveText("1 / 3");
  expect(errors).toEqual([]);
});

test("saves from before the launch change are treated as returning players", async ({
  page,
}) => {
  // Older saves have no profileComplete flag but do have progress.
  const legacy = { ...savedProfile, profileComplete: undefined };
  delete legacy.profileComplete;
  await page.addInitScript(seedProfile, legacy);
  await page.goto("/");
  await expect(page.locator("#home-screen")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /Kumusta ulit, Geon/ }),
  ).toBeVisible();
  await expect(page.locator("#xp-value")).toHaveText("20");
});

test("saved profile without progress still opens the player card", async ({
  page,
}) => {
  const typedOnly = {
    name: "Typed",
    avatar: "🦉",
    difficulty: "brave",
    topics: ["Math"],
    xp: 0,
    coins: 0,
    sound: true,
    solved: [],
    dailyRewardClaimed: false,
    profileComplete: false,
  };
  await page.addInitScript(seedProfile, typedOnly);
  await page.goto("/");
  await expect(page.locator("#welcome-screen")).toBeVisible();
  await expect(page.getByLabel(/What should we call you/)).toHaveValue("Typed");
  await expect(page.locator("#hero-avatar")).toHaveText("🦉");
});

test("cached app works with network offline", async ({ page, context }) => {
  await page.goto("/");
  await expect(page.locator("#welcome-screen")).toBeVisible();
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
  await expect(page.locator("#welcome-screen")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /Create Your Player Card/ }),
  ).toBeVisible();
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
    await expect(page.locator("#welcome-screen")).toBeVisible({
      timeout: 10000,
    });
  }
});

for (const mode of ["unsupported", "rejected"]) {
  test(`fullscreen ${mode} shows fallback without breaking navigation`, async ({
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
    await expect(page.locator("#welcome-fullscreen-note")).not.toBeEmpty();
    await page.getByRole("button", { name: /PROCEED/ }).click();
    await expect(page.locator("#home-screen")).toBeVisible();
    await page.getByRole("button", { name: /START QUIZ/ }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });
}

test("reduced motion keeps the game usable", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("#welcome-screen")).toBeVisible();
  await page.getByRole("button", { name: "Panda avatar" }).click();
  await expect(page.locator("#hero-avatar")).toHaveText("🐼");
  await page.getByRole("button", { name: /PROCEED/ }).click();
  await expect(page.locator("#home-screen")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /START QUIZ/ }),
  ).toBeVisible();
});
