import { expect, test } from "@playwright/test";

test("mobile navigation opens, supports Escape, and navigates", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Open navigation" });
  await expect(toggle).toBeVisible();
  // Wait for the client-rendered content state before interacting with the header.
  await expect(page.locator(".system-list")).not.toContainText("Loading published content");
  await toggle.click();
  const navigation = page.getByRole("navigation", { name: "Mobile navigation" });
  await expect(navigation).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(navigation).toBeHidden();
  await expect(toggle).toBeFocused();
  await toggle.click();
  await navigation.getByRole("link", { name: "Services", exact: true }).click();
  await expect(page).toHaveURL(/\/services$/);
  await expect(navigation).toBeHidden();
});

test("empty publishing lists never restore sample content", async ({ page }) => {
  await page.route("**/api/v1/services", route => route.fulfill({ json: { services: [] } }));
  await page.route("**/api/v1/portfolio", route => route.fulfill({ json: { portfolio: [] } }));
  for (const path of ["/", "/services", "/case-studies"]) {
    await page.goto(path);
    await expect(page.getByText("No items are published yet.").first()).toBeVisible();
    await expect(page.getByText("Fintech transaction platform", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Build the product", { exact: true })).toHaveCount(0);
  }
});

test("public content recovers after a failed request", async ({ page }) => {
  let failed = true;
  await page.route("**/api/v1/services", route => failed
    ? route.fulfill({ status: 503, json: { error: "Unavailable" } })
    : route.fulfill({ json: { services: [{ id: "test", slug: "test", number: "01", title: "Published service", summary: "Current database content", stack: "Go" }] } }));
  await page.goto("/services");
  await expect(page.getByRole("alert")).toContainText("temporarily unavailable");
  failed = false;
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("heading", { name: "Published service" })).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("desktop authentication forms keep their primary actions in view", async ({ page }) => {
  for (const { width, height } of [{ width: 1440, height: 700 }, { width: 1440, height: 900 }, { width: 390, height: 700 }, { width: 360, height: 740 }]) {
    await page.setViewportSize({ width, height });
    for (const [path, buttonName] of [["/login", /sign in securely/i], ["/register", /create account/i]] as const) {
      await page.goto(path);
      await expect(page.locator(".auth-card .auth-brand")).toBeVisible();
      await expect(page.getByRole("button", { name: buttonName })).toBeInViewport();
    }
  }
});

for (const width of [360, 390, 768, 1440]) {
  test(`public layouts fit ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/", "/services", "/case-studies", "/contact", "/login"]) {
      await page.goto(path);
      await expect(page.locator("main")).toBeVisible();
      await expect(page.getByText("Loading published content...", { exact: true })).toHaveCount(0);
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${path} overflows at ${width}px`).toBe(true);
    }
  });
}
