import { expect, test } from "@playwright/test";

// Run as Chromium in the normal suite and as Firefox/WebKit in the dedicated
// cross-browser CI job. These checks are lightweight public smoke tests.
const publicRoutes = [
  "/", "/services", "/contact",
  "/akeluwatoolbox/", "/akeluwatoolbox/digital-stamp-maker/",
  "/publicinfohub/", "/publicinfohub/offices/",
  "/publicinfohub/utilities/",
];

test("public applications render without horizontal overflow on narrow phones", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  for (const route of publicRoutes) {
    const response = await page.goto(route, { waitUntil: "domcontentloaded" });
    expect(response?.status(), route).toBe(200);
    await expect(page.locator("body")).toBeVisible();
    const overflow = await page.evaluate(() =>
      Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth
    );
    expect(overflow, route + " has horizontal overflow").toBeLessThanOrEqual(1);
  }
});

test("mobile company and toolbox navigation support Escape", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Open navigation" });
  await expect(toggle).toBeVisible();
  await toggle.click();
  await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeHidden();

  await page.goto("/akeluwatoolbox/");
  const toolToggle = page.getByRole("button", { name: "Open tools menu" });
  await expect(toolToggle).toBeVisible();
  await toolToggle.click();
  await expect(page.getByRole("navigation", { name: "Tool navigation" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("navigation", { name: "Tool navigation" })).toBeHidden();
});
