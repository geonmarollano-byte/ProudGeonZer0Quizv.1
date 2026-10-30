const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");

/* Upgrade 2 suite: Welcome screen, Admin Login screen and authentication
   behaviour. No real credentials exist in this repository, so every
   authentication test either uses the shipped "not configured" state or a
   stubbed endpoint. */

const STUB_ENDPOINT = "https://auth.example.test/admin/login";

async function openWelcome(page) {
  await page.goto("/");
  await expect(page.locator("#screen-welcome")).toBeVisible({ timeout: 30000 });
}

async function openLogin(page) {
  await openWelcome(page);
  await page.getByRole("button", { name: "ADMIN LOGIN" }).click();
  await expect(page.locator("#screen-login")).toBeVisible();
}

test.describe("welcome screen", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("shows the required branding and a single navigation control", async ({
    page,
  }) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await openWelcome(page);

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "WELCOME TO THE NEXT LEVEL.",
    );
    await expect(
      page.getByText("A place where curiosity meets knowledge."),
    ).toBeVisible();
    await expect(page.locator("#screen-welcome .brand-line")).toContainText(
      "PROUDGEON ZER0QUIZ",
    );
    await expect(page.locator("#screen-welcome .brand-line .version")).toHaveText(
      "V.1",
    );
    await expect(page.locator("#screen-welcome footer")).toContainText(
      "VERSION 1.0",
    );
    await expect(page.locator("#screen-welcome .studio")).toContainText(
      "PLAY. GROW.",
    );
    await expect(page.locator("#screen-welcome .eyebrow")).toHaveText(
      "THE MIND IS LIMITLESS",
    );

    // Exactly one control, and it is the only navigation destination.
    const buttons = page.locator("#screen-welcome button");
    await expect(buttons).toHaveCount(1);
    await expect(buttons).toHaveText(/ADMIN LOGIN/);

    // Nothing else from the old gameplay scope is present.
    await expect(page.locator("#screen-welcome form")).toHaveCount(0);
    await expect(page.locator("nav")).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test("is the active screen after loading, with no page scroll", async ({
    page,
  }) => {
    const remote = [];
    page.on("request", (request) => {
      if (!request.url().startsWith("http://127.0.0.1:3000"))
        remote.push(request.url());
    });
    await openWelcome(page);
    expect(await page.evaluate(() => document.body.dataset.screen)).toBe(
      "welcome",
    );
    const size = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
      width: innerWidth,
      height: innerHeight,
    }));
    expect(size.scrollWidth).toBeLessThanOrEqual(size.width);
    expect(size.scrollHeight).toBeLessThanOrEqual(size.height);
    expect(remote).toEqual([]);
  });
});

test.describe("admin login screen", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("opens from the welcome screen and returns with Back to Welcome", async ({
    page,
  }) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await openLogin(page);

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "ADMIN LOGIN",
    );
    await expect(page.getByText("AUTHORIZED ACCESS ONLY")).toBeVisible();
    await expect(page.locator("#admin-username")).toBeVisible();
    await expect(page.locator("#admin-password")).toBeVisible();
    await expect(page.getByRole("button", { name: /SECURE LOGIN/ })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Show password" }),
    ).toBeVisible();
    await expect(page.locator("#screen-welcome")).toBeHidden();
    // Focus lands in the first field for keyboard users.
    await expect(page.locator("#admin-username")).toBeFocused();

    await page.getByRole("button", { name: /BACK TO WELCOME/ }).click();
    await expect(page.locator("#screen-welcome")).toBeVisible();
    await expect(page.locator("#screen-login")).toBeHidden();
    await expect(
      page.getByRole("button", { name: "ADMIN LOGIN" }),
    ).toBeFocused();
    expect(errors).toEqual([]);
  });

  test("password visibility control toggles without losing the value", async ({
    page,
  }) => {
    await openLogin(page);
    const password = page.locator("#admin-password");
    const toggle = page.getByRole("button", { name: "Show password" });

    await password.fill("Example-Passphrase-123");
    await expect(password).toHaveAttribute("type", "password");
    await expect(toggle).toHaveAttribute("aria-pressed", "false");

    await toggle.click();
    await expect(password).toHaveAttribute("type", "text");
    await expect(
      page.getByRole("button", { name: "Hide password" }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(password).toHaveValue("Example-Passphrase-123");

    await page.getByRole("button", { name: "Hide password" }).click();
    await expect(password).toHaveAttribute("type", "password");
    await expect(password).toHaveValue("Example-Passphrase-123");
  });

  test("empty fields are rejected before any network request", async ({
    page,
  }) => {
    const attempts = [];
    await page.route(STUB_ENDPOINT, (route) => {
      attempts.push(route.request().postData());
      route.fulfill({ status: 200, body: '{"authenticated":true}' });
    });
    await page.addInitScript((endpoint) => {
      window.PG_AUTH_CONFIG = { endpoint };
    }, STUB_ENDPOINT);

    await openLogin(page);
    await page.getByRole("button", { name: /SECURE LOGIN/ }).click();

    await expect(page.locator("#username-error")).toBeVisible();
    await expect(page.locator("#username-error")).toHaveText(
      "ENTER YOUR ADMIN USERNAME.",
    );
    await expect(page.locator("#password-error")).toBeVisible();
    await expect(page.locator("#password-error")).toHaveText(
      "ENTER YOUR ADMIN PASSWORD.",
    );
    await expect(page.locator("#admin-username")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await expect(page.locator("#login-status")).toHaveText(
      "CHECK THE HIGHLIGHTED FIELDS AND TRY AGAIN.",
    );
    expect(attempts).toEqual([]);

    // Typing clears the field-level error again.
    await page.locator("#admin-username").fill("pg-admin");
    await expect(page.locator("#username-error")).toBeHidden();
    await expect(page.locator("#admin-username")).not.toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  test("invalid credentials show a generic error and echo nothing", async ({
    page,
  }) => {
    const sent = [];
    await page.route(STUB_ENDPOINT, (route) => {
      sent.push(route.request().postData());
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: '{"authenticated":false}',
      });
    });
    await page.addInitScript((endpoint) => {
      window.PG_AUTH_CONFIG = { endpoint };
    }, STUB_ENDPOINT);

    await openLogin(page);
    await page.locator("#admin-username").fill("pg-admin");
    await page.locator("#admin-password").fill("Wrong-Passphrase-999");
    await page.getByRole("button", { name: /SECURE LOGIN/ }).click();

    await expect(page.locator("#login-status")).toHaveText(
      "INVALID USERNAME OR PASSWORD.",
    );
    await expect(page.locator("#login-status")).toHaveAttribute(
      "data-tone",
      "error",
    );
    // The typed password is never echoed back and is cleared after failure.
    await expect(page.locator("#admin-password")).toHaveValue("");
    await expect(page.locator("#screen-login")).toBeVisible();
    await expect(page.locator("#screen-login")).not.toContainText(
      "Wrong-Passphrase-999",
    );
    // Exactly one attempt was sent, as application/json.
    expect(sent).toEqual([
      JSON.stringify({ username: "pg-admin", password: "Wrong-Passphrase-999" }),
    ]);
  });

  test("valid credentials report an active session and stay on the screen", async ({
    page,
  }) => {
    await page.route(STUB_ENDPOINT, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: '{"authenticated":true}',
      }),
    );
    await page.addInitScript((endpoint) => {
      window.PG_AUTH_CONFIG = { endpoint };
    }, STUB_ENDPOINT);

    await openLogin(page);
    await page.locator("#admin-username").fill("pg-admin");
    await page.locator("#admin-password").fill("Example-Passphrase-123");
    await page.getByRole("button", { name: /SECURE LOGIN/ }).click();

    await expect(page.locator("#login-status")).toHaveText(
      "ACCESS GRANTED. ADMINISTRATOR SESSION IS ACTIVE.",
    );
    await expect(page.locator("#login-status")).toHaveAttribute(
      "data-tone",
      "success",
    );
    // No credential retention, no further submissions.
    await expect(page.locator("#admin-password")).toHaveValue("");
    await expect(page.locator("#admin-username")).toBeDisabled();
    await expect(page.locator("#admin-password")).toBeDisabled();
    await expect(page.getByRole("button", { name: /SECURE LOGIN/ })).toBeDisabled();
    // Only the three authorised screens exist; nothing else opens.
    await expect(page.locator("#screen-login")).toBeVisible();
    await expect(page.locator("#screen-welcome")).toBeHidden();
    await expect(page.locator("#screen-loading")).toBeHidden();
  });

  test("repeated submits while verifying are ignored", async ({ page }) => {
    let attempts = 0;
    await page.route(STUB_ENDPOINT, async (route) => {
      attempts += 1;
      await new Promise((resolve) => setTimeout(resolve, 400));
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: '{"authenticated":false}',
      });
    });
    await page.addInitScript((endpoint) => {
      window.PG_AUTH_CONFIG = { endpoint };
    }, STUB_ENDPOINT);

    await openLogin(page);
    await page.locator("#admin-username").fill("pg-admin");
    await page.locator("#admin-password").fill("Another-Passphrase-42");

    const submit = page.getByRole("button", { name: /SECURE LOGIN/ });
    await submit.click();
    // Force extra clicks/keys while the first attempt is still in flight.
    await page.locator("#admin-password").click({ force: true });
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");

    await expect(page.locator("#login-status")).toHaveText(
      "INVALID USERNAME OR PASSWORD.",
      { timeout: 10000 },
    );
    expect(attempts).toBe(1);
  });

  test("unconfigured deployment refuses to verify and never fakes success", async ({
    page,
  }) => {
    const requests = [];
    page.on("request", (request) => {
      if (request.method() === "POST") requests.push(request.url());
    });
    await openLogin(page);

    // The shipped configuration has no endpoint, so the notice is shown.
    await expect(page.locator("#auth-notice")).toBeVisible();
    await expect(page.locator("#auth-notice")).toContainText(
      "SECURE AUTHENTICATION IS NOT CONFIGURED",
    );

    await page.locator("#admin-username").fill("pg-admin");
    await page.locator("#admin-password").fill("Example-Passphrase-123");
    await page.getByRole("button", { name: /SECURE LOGIN/ }).click();

    await expect(page.locator("#login-status")).toHaveText(
      /SECURE AUTHENTICATION IS NOT CONFIGURED/,
    );
    await expect(page.locator("#login-status")).toHaveAttribute(
      "data-tone",
      "notice",
    );
    await expect(page.locator("#login-status")).not.toHaveText(
      /ACCESS GRANTED/,
    );
    expect(requests).toEqual([]);
  });

  test("a failing endpoint is reported as unavailable", async ({ page }) => {
    await page.route(STUB_ENDPOINT, (route) => route.abort("failed"));
    await page.addInitScript((endpoint) => {
      window.PG_AUTH_CONFIG = { endpoint };
    }, STUB_ENDPOINT);

    await openLogin(page);
    await page.locator("#admin-username").fill("pg-admin");
    await page.locator("#admin-password").fill("Example-Passphrase-123");
    await page.getByRole("button", { name: /SECURE LOGIN/ }).click();

    await expect(page.locator("#login-status")).toHaveText(
      "THE AUTHENTICATION SERVICE IS UNAVAILABLE. PLEASE TRY AGAIN LATER.",
    );
    await expect(page.locator("#login-status")).not.toHaveText(/ACCESS GRANTED/);
  });

  test("insecure endpoints are ignored", async ({ page }) => {
    await page.addInitScript(() => {
      window.PG_AUTH_CONFIG = { endpoint: "http://admin.example.test/login" };
    });
    await openLogin(page);
    await expect(page.locator("#auth-notice")).toBeVisible();
    await page.locator("#admin-username").fill("pg-admin");
    await page.locator("#admin-password").fill("Example-Passphrase-123");
    await page.getByRole("button", { name: /SECURE LOGIN/ }).click();
    await expect(page.locator("#login-status")).toHaveText(
      /SECURE AUTHENTICATION IS NOT CONFIGURED/,
    );
  });
});

test.describe("responsive layout", () => {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1280, height: 800 },
    { width: 800, height: 600 },
    { width: 393, height: 851 },
    { width: 360, height: 640 },
    { width: 320, height: 568 },
    { width: 320, height: 480 },
    { width: 851, height: 393 },
  ]) {
    test(`welcome and login fit ${viewport.width}x${viewport.height}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await openLogin(page);

      const measure = () =>
        page.evaluate(() => {
          const visible = [...document.querySelectorAll(".app > .screen")].find(
            (node) => !node.hidden,
          );
          const rects = [...visible.querySelectorAll("*")]
            .map((node) => node.getBoundingClientRect())
            .filter((rect) => rect.width > 0 && rect.height > 0);
          return {
            screen: visible.id,
            pageWidth: document.documentElement.scrollWidth,
            pageHeight: document.documentElement.scrollHeight,
            width: innerWidth,
            height: innerHeight,
            minLeft: Math.min(...rects.map((r) => r.left)),
            maxRight: Math.max(...rects.map((r) => r.right)),
            innerScrollable:
              visible.scrollHeight > visible.clientHeight + 1 ||
              visible.scrollWidth > visible.clientWidth + 1,
          };
        });

      // Welcome screen
      await page.getByRole("button", { name: /BACK TO WELCOME/ }).click();
      const welcome = await measure();
      expect(welcome.screen).toBe("screen-welcome");
      expect(welcome.pageWidth).toBeLessThanOrEqual(welcome.width);
      expect(welcome.pageHeight).toBeLessThanOrEqual(welcome.height);
      expect(welcome.minLeft).toBeGreaterThanOrEqual(-1);
      expect(welcome.maxRight).toBeLessThanOrEqual(welcome.width + 1);
      await expect(
        page.getByRole("button", { name: "ADMIN LOGIN" }),
      ).toBeInViewport();

      // Login screen
      await page.getByRole("button", { name: "ADMIN LOGIN" }).click();
      const login = await measure();
      expect(login.screen).toBe("screen-login");
      expect(login.pageWidth).toBeLessThanOrEqual(login.width);
      expect(login.pageHeight).toBeLessThanOrEqual(login.height);
      expect(login.minLeft).toBeGreaterThanOrEqual(-1);
      expect(login.maxRight).toBeLessThanOrEqual(login.width + 1);
      // Every control must be reachable (the card may scroll internally on
      // very short landscape viewports, never the page itself).
      for (const selector of [
        "#admin-username",
        "#admin-password",
        "#password-toggle",
        "#login-submit",
        "#back-to-welcome",
      ]) {
        const control = page.locator(selector);
        await control.scrollIntoViewIfNeeded();
        await expect(control).toBeInViewport();
      }
      await page.locator("#screen-login").evaluate((node) => {
        node.scrollTop = 0;
      });

      if (viewport.width === 393)
        await page.screenshot({
          path: test.info().outputPath("login-mobile.png"),
          fullPage: true,
        });
      if (viewport.width === 1440)
        await page.screenshot({
          path: test.info().outputPath("login-desktop.png"),
          fullPage: true,
        });
      expect(errors).toEqual([]);
    });
  }

  test("reduced motion still reaches the welcome screen", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openLogin(page);
    await expect(page.locator("#screen-login")).toBeVisible();
    await expect(page.locator("#auth-card, .auth-card")).toBeVisible();
  });
});

test("no credentials or secrets are shipped in the public bundle", () => {
  const root = path.join(__dirname, "..");
  const files = [
    "index.html",
    "app.js",
    "style.css",
    "sw.js",
    "auth-config.json",
    "README.md",
  ];
  const offenders = [];
  for (const file of files) {
    const source = fs.readFileSync(path.join(root, file), "utf8");
    const patterns = [
      /\bpg-admin\b\s*[:=]\s*["']/i, // username assigned to a value
      /\bpassword\b\s*[:=]\s*["'][^"']+["']/i, // password assigned to a value
      /\$2[aby]\$\d\d\$/, // bcrypt hash
      /\$argon2(id|i|d)\$/, // argon2 hash
      /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
      /(api[_-]?key|secret|token)\s*[:=]\s*["'][A-Za-z0-9_\-]{12,}["']/i,
    ];
    for (const pattern of patterns) {
      if (pattern.test(source)) offenders.push(`${file}: ${pattern}`);
    }
  }
  expect(offenders).toEqual([]);
  // The configuration file must ship without an endpoint configured.
  const config = JSON.parse(
    fs.readFileSync(path.join(root, "auth-config.json"), "utf8"),
  );
  expect(typeof config.endpoint).toBe("string");
  expect(config.endpoint).toBe("");
});
