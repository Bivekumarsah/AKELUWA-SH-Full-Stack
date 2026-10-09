import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const path of ["/", "/about", "/services", "/case-studies", "/contact", "/verify-contract", "/login", "/register", "/forgot-password", "/reset-password", "/verify-email"]) {
  test(`${path} has no WCAG A or AA violations`, async ({ page }) => {
    await page.route("**/api/v1/auth/me", route => route.fulfill({ status: 401, json: { error: "authentication required" } }));
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main:not(.app-route-loading)")).toBeVisible();
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(result.violations, result.violations.map(item => `${item.id}: ${item.help}`).join("\n")).toEqual([]);
  });
}
