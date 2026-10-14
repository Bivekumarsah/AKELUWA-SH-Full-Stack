import { expect, test } from "@playwright/test";

const apiURL = process.env.FULL_STACK_API_URL;
const proxyFrom = process.env.FULL_STACK_API_PROXY_FROM?.replace(/\/$/, "");

test.skip(!apiURL, "requires a running Go API and isolated PostgreSQL database");

if (proxyFrom) {
  test.beforeEach(async ({ page }) => {
    await page.route(`${proxyFrom}/**`, async (route) => {
      const target = route.request().url().replace(proxyFrom, apiURL!);
      const response = await route.fetch({ url: target });
      await route.fulfill({ response });
    });
  });
}

test("published services come from the Go API", async ({ page, request }) => {
  const response = await request.get(`${apiURL}/services`);
  expect(response.ok()).toBeTruthy();
  const data = await response.json() as { services: Array<{ title: string }> };
  expect(data.services.length).toBeGreaterThan(0);

  await page.goto("/services");
  await expect(page.locator(".service-list h2").first()).toHaveText(data.services[0].title);
});

test("project inquiry reaches PostgreSQL through the Go API", async ({ page }) => {
  await page.goto("/contact", { waitUntil: "networkidle" });
  const form = page.locator("#contact-form");
  await form.getByLabel("Name").fill("Full Stack Test Client");
  await form.getByLabel("Email").fill("full-stack-test@example.test");
  await form.getByLabel("Tell us about the system").fill("Please build a testable project portal for our team.");

  const responsePromise = page.waitForResponse((response) =>
    new URL(response.url()).pathname === "/api/v1/inquiries" && response.request().method() === "POST");
  await form.getByRole("button", { name: /Start a project with AKELUWA/ }).click();
  const response = await responsePromise;
  expect(response.url()).toBe(`${proxyFrom || apiURL}/inquiries`);
  expect(response.status()).toBe(201);
  const data = await response.json() as { inquiry: { id: string } };
  expect(data.inquiry.id).toBeTruthy();
  await expect(form.getByRole("status")).toContainText("project inquiry has been received");
});
