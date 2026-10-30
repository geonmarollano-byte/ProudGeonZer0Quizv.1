const { test, expect } = require("@playwright/test");

/* UPGRADE 2 suite — Welcome screen, Admin Login panel, player info panel.
   Covers TEST 1–10 from the specification. */

async function reachWelcome(page) {
  await page.goto("/");
  await page.getByRole("button", { name: /CONTINUE/ }).click({ timeout: 30000 });
  await expect(page.locator("#screen-welcome")).toBeVisible();
}

test("full upgrade 2 flow", async ({ page }) => {
  test.setTimeout(120000);
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (["error","warning"].includes(m.type())) errors.push(m.type() + ": " + m.text()); });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  // loading screen intact
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("PROUDGEONZER0QUIZV.1");
  await expect(page.locator("#screen-welcome")).toBeHidden();

  // continue -> welcome
  await page.getByRole("button", { name: /CONTINUE/ }).click({ timeout: 30000 });
  await expect(page.locator("#screen-welcome")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("WELCOME BACK PLAYER");
  await expect(page.getByText("Welcome to your gaming experience.")).toBeVisible();
  await page.screenshot({ animations: "disabled", caret: "hide", path: "test-results/u2-welcome.png" });

  // admin panel
  await page.getByRole("button", { name: "LOGIN AS AN ADMIN" }).click();
  await expect(page.locator("#admin-panel")).toBeVisible();
  await expect(page.getByRole("heading", { name: "ADMIN LOGIN" })).toBeVisible();
  await expect(page.getByText("Enter your administrator credentials to continue.")).toBeVisible();
  await page.screenshot({ animations: "disabled", caret: "hide", path: "test-results/u2-admin.png" });

  // wrong creds
  await page.fill("#admin-username", "GeonZero");
  await page.fill("#admin-password", "wrong-password");
  await page.getByRole("button", { name: "VERIFY ADMIN LOGIN" }).click();
  await expect(page.locator("#admin-message")).toHaveText("Please enter your correct password or username before you can access.");
  await expect(page.locator("#admin-message")).toHaveAttribute("data-tone", "error");
  await page.screenshot({ animations: "disabled", caret: "hide", path: "test-results/u2-error.png" });

  // correct creds
  await page.fill("#admin-username", "GeonZero");
  await page.fill("#admin-password", "PGZer0@1112!");
  await page.getByRole("button", { name: "VERIFY ADMIN LOGIN" }).click();
  await expect(page.locator("#admin-message")).toHaveText("Your password is correct!", { timeout: 15000 });
  await expect(page.locator("#admin-message")).toHaveAttribute("data-tone", "success");
  await expect(page.locator("#admin-panel")).toBeVisible();
  await page.screenshot({ animations: "disabled", caret: "hide", path: "test-results/u2-success.png" });

  // back to welcome
  await page.getByRole("button", { name: "BACK TO WELCOME SCREEN" }).click();
  await expect(page.locator("#admin-panel")).toBeHidden();
  await expect(page.locator("#screen-welcome")).toBeVisible();

  // join as player
  await page.getByRole("button", { name: "JOIN AS A PLAYER" }).click();
  await expect(page.locator("#construction-panel")).toBeVisible();
  await expect(page.locator("#construction-panel")).toContainText("Under Contraction Please wait a little longer...");
  await page.screenshot({ animations: "disabled", caret: "hide", path: "test-results/u2-construction.png" });
  await page.getByRole("button", { name: "CLOSE" }).click();
  await expect(page.locator("#construction-panel")).toBeHidden();
  await expect(page.locator("#screen-welcome")).toBeVisible();

  // back to loading
  await page.getByRole("button", { name: /BACK$/ }).click();
  await expect(page.locator("#screen-welcome")).toBeHidden();
  await expect(page.locator("#screen-loading")).toBeVisible();
  await expect(page.getByRole("button", { name: /CONTINUE/ })).toBeVisible();
  await page.screenshot({ animations: "disabled", caret: "hide", path: "test-results/u2-back.png" });

  console.log("ERRORS " + JSON.stringify(errors));
});

test.describe("upgrade 2 requirements", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("TEST 1/2 — loading screen unchanged and CONTINUE opens Welcome", async ({
    page,
  }) => {
    const errors = [];
    page.on("pageerror", (event) => errors.push(event.message));
    await page.goto("/");
    // Loading screen is still the entry point.
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "PROUDGEONZER0QUIZV.1",
    );
    await expect(page.getByRole("progressbar")).toBeVisible();
    await expect(page.locator("#screen-welcome")).toBeHidden();
    // The Welcome screen never opens on its own.
    await expect(page.getByRole("button", { name: /CONTINUE/ })).toBeVisible({
      timeout: 30000,
    });
    await page.waitForTimeout(1200);
    await expect(page.locator("#screen-welcome")).toBeHidden();
    // Only CONTINUE opens it.
    await page.getByRole("button", { name: /CONTINUE/ }).click();
    await expect(page.locator("#screen-welcome")).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("TEST 3 — welcome screen text and buttons", async ({ page }) => {
    await reachWelcome(page);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "WELCOME BACK PLAYER",
    );
    await expect(
      page.getByText("Welcome to your gaming experience."),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "LOGIN AS AN ADMIN" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "JOIN AS A PLAYER" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "BACK", exact: true })).toBeVisible();
  });

  test("TEST 4 — LOGIN AS AN ADMIN opens the admin panel", async ({ page }) => {
    await reachWelcome(page);
    await expect(page.locator("#admin-panel")).toBeHidden();
    await page.getByRole("button", { name: "LOGIN AS AN ADMIN" }).click();
    await expect(page.locator("#admin-panel")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "ADMIN LOGIN" }),
    ).toBeVisible();
    await expect(
      page.getByText("Enter your administrator credentials to continue."),
    ).toBeVisible();
    await expect(page.locator("#admin-username")).toHaveAttribute(
      "placeholder",
      "Enter admin username",
    );
    await expect(page.locator("#admin-password")).toHaveAttribute(
      "placeholder",
      "Enter admin password",
    );
    await expect(page.locator("#admin-password")).toHaveAttribute(
      "type",
      "password",
    );
    await expect(
      page.getByRole("button", { name: "Show password" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "BACK TO WELCOME SCREEN" }),
    ).toBeVisible();
  });

  test("TEST 5 — incorrect credentials show the exact error and stay", async ({
    page,
  }) => {
    await reachWelcome(page);
    await page.getByRole("button", { name: "LOGIN AS AN ADMIN" }).click();

    // Wrong password
    await page.fill("#admin-username", "GeonZero");
    await page.fill("#admin-password", "definitely-wrong");
    await page.getByRole("button", { name: "VERIFY ADMIN LOGIN" }).click();
    await expect(page.locator("#admin-message")).toHaveText(
      "Please enter your correct password or username before you can access.",
      { timeout: 15000 },
    );
    await expect(page.locator("#admin-message")).toHaveAttribute(
      "data-tone",
      "error",
    );
    await expect(page.locator("#admin-panel")).toBeVisible();
    // The welcome screen stays behind the panel; nothing else opens.
    await expect(page.locator("#screen-welcome")).toBeVisible();

    // Wrong username
    await page.fill("#admin-username", "NotTheAdmin");
    await page.fill("#admin-password", "PGZer0@1112!");
    await page.getByRole("button", { name: "VERIFY ADMIN LOGIN" }).click();
    await expect(page.locator("#admin-message")).toHaveText(
      "Please enter your correct password or username before you can access.",
      { timeout: 15000 },
    );

    // Empty fields also refuse access.
    await page.fill("#admin-username", "");
    await page.fill("#admin-password", "");
    await page.getByRole("button", { name: "VERIFY ADMIN LOGIN" }).click();
    await expect(page.locator("#admin-message")).toHaveText(
      "Please enter your correct password or username before you can access.",
    );
  });

  test("TEST 6 — correct credentials show the success message only", async ({
    page,
  }) => {
    await reachWelcome(page);
    await page.getByRole("button", { name: "LOGIN AS AN ADMIN" }).click();
    await page.fill("#admin-username", "GeonZero");
    await page.fill("#admin-password", "PGZer0@1112!");
    await page.getByRole("button", { name: "VERIFY ADMIN LOGIN" }).click();
    await expect(page.locator("#admin-message")).toHaveText(
      "Your password is correct!",
      { timeout: 15000 },
    );
    await expect(page.locator("#admin-message")).toHaveAttribute(
      "data-tone",
      "success",
    );
    // No Home screen, no dashboard: the panel is still the only thing shown.
    await expect(page.locator("#admin-panel")).toBeVisible();
    await expect(page.locator(".app > .screen")).toHaveCount(2);
    await expect(page.locator("[data-home], #screen-home")).toHaveCount(0);
    // The password is cleared and the verified state cannot be resubmitted.
    await expect(page.locator("#admin-password")).toHaveValue("");
    await expect(page.locator("#admin-username")).toBeDisabled();
    await expect(page.getByRole("button", { name: "VERIFY ADMIN LOGIN" })).toBeDisabled();
  });

  test("TEST 7/8 — JOIN AS A PLAYER panel and CLOSE", async ({ page }) => {
    await reachWelcome(page);
    await page.getByRole("button", { name: "JOIN AS A PLAYER" }).click();
    await expect(page.locator("#construction-panel")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "UNDER CONSTRUCTION" }),
    ).toBeVisible();
    await expect(page.locator("#construction-panel")).toContainText(
      "Under Contraction Please wait a little longer...",
    );
    // No registration or player login exists.
    await expect(page.locator("#construction-panel input")).toHaveCount(0);
    await page.getByRole("button", { name: "CLOSE" }).click();
    await expect(page.locator("#construction-panel")).toBeHidden();
    await expect(page.locator("#screen-welcome")).toBeVisible();
  });

  test("TEST 9 — BACK returns to the existing loading screen", async ({
    page,
  }) => {
    await reachWelcome(page);
    await page.getByRole("button", { name: "BACK", exact: true }).click();
    await expect(page.locator("#screen-welcome")).toBeHidden();
    await expect(page.locator("#screen-loading")).toBeVisible();
    // The original loading screen is preserved, still showing CONTINUE.
    await expect(page.getByRole("button", { name: /CONTINUE/ })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "PROUDGEONZER0QUIZV.1",
    );
    // And it can open the Welcome screen again.
    await page.getByRole("button", { name: /CONTINUE/ }).click();
    await expect(page.locator("#screen-welcome")).toBeVisible();
  });

  test("admin panel BACK returns to Welcome, not the loading screen", async ({
    page,
  }) => {
    await reachWelcome(page);
    await page.getByRole("button", { name: "LOGIN AS AN ADMIN" }).click();
    await page.fill("#admin-username", "GeonZero");
    await page.fill("#admin-password", "wrong");
    await page.getByRole("button", { name: "VERIFY ADMIN LOGIN" }).click();
    await expect(page.locator("#admin-message")).toHaveText(
      "Please enter your correct password or username before you can access.",
      { timeout: 15000 },
    );
    await page.getByRole("button", { name: "BACK TO WELCOME SCREEN" }).click();
    await expect(page.locator("#admin-panel")).toBeHidden();
    await expect(page.locator("#screen-welcome")).toBeVisible();
    await expect(page.locator("#screen-loading")).toBeHidden();
    // Reopening starts from a clean panel.
    await page.getByRole("button", { name: "LOGIN AS AN ADMIN" }).click();
    await expect(page.locator("#admin-message")).toBeEmpty();
    await expect(page.locator("#admin-password")).toHaveValue("");
  });

  test("show/hide password control", async ({ page }) => {
    await reachWelcome(page);
    await page.getByRole("button", { name: "LOGIN AS AN ADMIN" }).click();
    await page.fill("#admin-password", "PGZer0@1112!");
    await page.getByRole("button", { name: "Show password" }).click();
    await expect(page.locator("#admin-password")).toHaveAttribute("type", "text");
    await expect(page.locator("#admin-password")).toHaveValue("PGZer0@1112!");
    await page.getByRole("button", { name: "Hide password" }).click();
    await expect(page.locator("#admin-password")).toHaveAttribute(
      "type",
      "password",
    );
  });

  test("credentials are not stored anywhere in the bundle", async ({
    page,
  }) => {
    const fs = require("node:fs");
    const path = require("node:path");
    const root = path.join(__dirname, "..");
    for (const file of ["index.html", "app.js", "auth-config.js", "sw.js"]) {
      const source = fs.readFileSync(path.join(root, file), "utf8");
      expect(source).not.toContain("PGZer0@1112!");
      expect(source).not.toContain("GeonZero");
    }
    // Nothing is persisted while signing in.
    await reachWelcome(page);
    await page.getByRole("button", { name: "LOGIN AS AN ADMIN" }).click();
    await page.fill("#admin-username", "GeonZero");
    await page.fill("#admin-password", "PGZer0@1112!");
    await page.getByRole("button", { name: "VERIFY ADMIN LOGIN" }).click();
    await expect(page.locator("#admin-message")).toHaveText(
      "Your password is correct!",
      { timeout: 15000 },
    );
    const stored = await page.evaluate(() => ({
      local: Object.keys(localStorage),
      session: Object.keys(sessionStorage),
    }));
    expect(stored.session).toEqual([]);
    expect(
      stored.local.every((key) => key.startsWith("proudgeon-loading.sound")),
    ).toBe(true);
  });
});

test.describe("responsive", () => {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1280, height: 800 },
    { width: 800, height: 600 },
    { width: 393, height: 851 },
    { width: 360, height: 640 },
    { width: 320, height: 480 },
    { width: 851, height: 393 },
  ]) {
    test(`TEST 10 — welcome + panels fit ${viewport.width}x${viewport.height}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      const errors = [];
      page.on("pageerror", (event) => errors.push(event.message));
      await reachWelcome(page);

      const page_ = await page.evaluate(() => ({
        sw: document.documentElement.scrollWidth,
        sh: document.documentElement.scrollHeight,
        w: innerWidth,
        h: innerHeight,
      }));
      expect(page_.sw).toBeLessThanOrEqual(page_.w);
      expect(page_.sh).toBeLessThanOrEqual(page_.h);
      await expect(page.getByRole("button", { name: "LOGIN AS AN ADMIN" })).toBeInViewport();
      await expect(page.getByRole("button", { name: "JOIN AS A PLAYER" })).toBeInViewport();
      await expect(page.getByRole("button", { name: "BACK", exact: true })).toBeInViewport();

      await page.getByRole("button", { name: "LOGIN AS AN ADMIN" }).click();
      const panel = await page.locator("#admin-panel").boundingBox();
      expect(panel.y).toBeGreaterThanOrEqual(0);
      expect(panel.y + panel.height).toBeLessThanOrEqual(viewport.height);
      await expect(page.locator("#admin-submit")).toBeInViewport();
      await expect(page.locator("#admin-back")).toBeInViewport();

      await page.getByRole("button", { name: "BACK TO WELCOME SCREEN" }).click();
      await page.getByRole("button", { name: "JOIN AS A PLAYER" }).click();
      await expect(page.locator("#construction-close")).toBeInViewport();
      expect(errors).toEqual([]);
    });
  }
});
