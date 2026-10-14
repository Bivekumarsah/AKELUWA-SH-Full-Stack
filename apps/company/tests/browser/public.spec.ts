import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("company homepage explains services and preserves published content and branding", async ({ page }) => {
  await page.route("**/api/v1/company-brand", route => route.fulfill({ json: { company_brand: {
    display_name: "AKELUWA SH", tagline: "Software for everyday operations.", tagline_meaning: "A company introduction maintained by the administrator.",
  } } }));
  await page.route("**/api/v1/services", route => route.fulfill({ json: { services: [{ id: "service", slug: "product-engineering", title: "Custom product engineering", summary: "Published service description", stack: "React / Go" }] } }));
  await page.route("**/api/v1/portfolio", route => route.fulfill({ json: { portfolio: [{ id: "project", slug: "business-platform", title: "Business platform", summary: "Published project description", technologies: "Go / PostgreSQL", project_url: "https://example.com/project" }] } }));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Software built foryour business.");
  await expect(page.getByRole("link", { name: "Discuss your project" })).toHaveAttribute("href", "/contact");
  await expect(page.getByRole("link", { name: "Custom product engineering" })).toHaveAttribute("href", "/services#product-engineering");
  await expect(page.getByRole("heading", { name: "Business platform" })).toBeVisible();
  await expect(page.getByRole("link", { name: "View project", exact: true })).toHaveAttribute("href", "https://example.com/project");
  await expect(page.getByRole("heading", { name: "Software for everyday operations." })).toBeVisible();
  await expect(page.getByText("A company introduction maintained by the administrator.")).toBeVisible();
  await expect(page.getByText(/CORE PULSE|ORIGIN SIGNAL|FOLLOW THE SIGNAL/)).toHaveCount(0);
  await page.getByRole("link", { name: "Use the form", exact: true }).click();
  await expect(page.locator("#contact-form")).toBeInViewport();
});

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
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.getByRole("navigation", { name: "Mobile navigation" }).getByRole("link", { name: "Services", exact: true })).toHaveAttribute("aria-current", "page");
  await page.keyboard.press("Escape");
  await expect(navigation).toBeHidden();
});

test("empty publishing lists never restore sample content", async ({ page }) => {
  await page.route("**/api/v1/services", route => route.fulfill({ json: { services: [] } }));
  await page.route("**/api/v1/portfolio", route => route.fulfill({ json: { portfolio: [] } }));
  for (const path of ["/", "/services", "/case-studies"]) {
    await page.goto(path);
    if (path === '/case-studies') {
      await expect(page.getByRole('heading', { name: 'AkeluwaToolBox' })).toBeVisible();
      await expect(page.getByText('No additional projects are published yet.')).toBeVisible();
    } else {
      await expect(page.getByText("No items are published yet.").first()).toBeVisible();
    }
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

test("service inquiries retain their topic and input after a failed submission", async ({ page }) => {
  await page.route("**/api/v1/services", route => route.fulfill({ json: { services: [{ id: "service", slug: "product-engineering", number: "01", title: "Custom product engineering", summary: "Published service description", stack: "React/Go" }] } }));
  const requests: Record<string, string>[] = [];
  await page.route("**/api/v1/inquiries", route => {
    requests.push(route.request().postDataJSON());
    return route.fulfill(requests.length === 1 ? { status: 503, json: { error: "Please try again shortly." } } : { status: 201, json: { inquiry: { id: "test-inquiry" } } });
  });
  await page.goto("/services");
  await page.getByRole("link", { name: "Discuss this service" }).click();
  await expect(page.locator(".inquiry-interest")).toContainText("Custom product engineering");
  const form = page.locator("#contact-form");
  await form.getByLabel("Name", { exact: true }).fill("Example Client");
  await form.getByLabel("Email", { exact: true }).fill("client@example.com");
  await form.getByLabel("Tell us about the system").fill("We need a new operations platform.");
  await form.getByText("Add company and budget details", { exact: true }).click();
  await form.getByLabel("Company optional").fill("Example Company");
  await form.getByLabel("Budget range optional").fill("Not sure yet");
  await form.getByRole("button", { name: "Start a project with AKELUWA" }).click();
  await expect(form.getByRole("alert")).toContainText("Please try again shortly.");
  await expect(form.getByLabel("Tell us about the system")).toHaveValue("We need a new operations platform.");
  await form.getByRole("button", { name: "Start a project with AKELUWA" }).click();
  await expect(form.getByRole("status")).toContainText("project inquiry has been received");
  await expect(form.getByRole("heading", { name: "Thank you. We have your inquiry." })).toBeFocused();
  await expect(form.getByText("client@example.com", { exact: true })).toBeVisible();
  expect(requests).toHaveLength(2);
  expect(requests[1]).toEqual({ name: "Example Client", email: "client@example.com", company: "Example Company", budget: "Not sure yet", message: "Service interest: Custom product engineering\n\nWe need a new operations platform." });
  await form.getByRole("button", { name: "Send another inquiry" }).click();
  await expect(form.getByLabel("Name", { exact: true })).toHaveValue("");
  await expect(form.getByLabel("Name", { exact: true })).toBeFocused();
});

test("a project inquiry topic can be removed before sending", async ({ page }) => {
  await page.route("**/api/v1/portfolio", route => route.fulfill({ json: { portfolio: [{ id: "project", slug: "business-platform", title: "Business platform", summary: "Published project description", technologies: "Go / PostgreSQL" }] } }));
  let submitted: Record<string, string> | undefined;
  await page.route("**/api/v1/inquiries", route => {
    submitted = route.request().postDataJSON();
    return route.fulfill({ status: 201, json: { inquiry: { id: "test-inquiry" } } });
  });
  await page.goto("/case-studies");
  await page.locator('.project-card').filter({ has: page.getByRole('heading', { name: 'Business platform' }) }).getByRole("link", { name: "Discuss a similar project" }).click();
  await expect(page.locator(".inquiry-interest")).toContainText("Business platform");
  await page.getByRole("button", { name: "Remove inquiry topic" }).click();
  await expect(page.locator(".inquiry-interest")).toHaveCount(0);
  const form = page.locator("#contact-form");
  await form.getByLabel("Name", { exact: true }).fill("Example Client");
  await form.getByLabel("Email", { exact: true }).fill("client@example.com");
  await form.getByLabel("Tell us about the system").fill("Please review our project requirements.");
  await form.getByRole("button", { name: "Start a project with AKELUWA" }).click();
  await expect(form.getByRole("status")).toContainText("project inquiry has been received");
  expect(submitted?.message).toBe("Please review our project requirements.");
});

test("delivery details support keyboard access and remain readable when expanded", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  const summary = page.locator(".company-process summary").first();
  await summary.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("An agreed scope and acceptance criteria", { exact: true })).toBeVisible();
  const result = await new AxeBuilder({ page }).include("#method").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(result.violations).toEqual([]);
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

test("customer registration requires email ownership before account access", async ({ page }) => {
  await page.route("**/api/v1/auth/**", async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/auth/me")) return route.fulfill({ status: 401, json: { error: "authentication required" } });
    if (path.endsWith("/auth/register")) {
      expect(route.request().postDataJSON()).toMatchObject({ email: "client@example.com", password: "a-secure-password" });
      return route.fulfill({ status: 202, json: { message: "Check your email to verify your account." } });
    }
    return route.fulfill({ status: 404, json: { error: "not mocked" } });
  });

  await page.goto("/register");
  await page.getByLabel("Full name").fill("Example Client");
  await page.getByLabel("Email address").fill("client@example.com");
  await page.getByLabel("Password").fill("a-secure-password");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "Check your inbox." })).toBeVisible();
  await expect(page.getByText("client@example.com")).toBeVisible();
});

test("password recovery uses a generic request response and resets once", async ({ page }) => {
  await page.route("**/api/v1/auth/password-reset/**", async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/request")) return route.fulfill({ status: 202, json: { message: "If the account exists, password reset instructions have been sent." } });
    expect(route.request().postDataJSON()).toMatchObject({ token: "test-reset-token", password: "replacement-password" });
    return route.fulfill({ json: { message: "Password updated. Sign in with your new password." } });
  });
  await page.goto("/forgot-password");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Email address").fill("unknown@example.com");
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByText("If the account exists, password reset instructions have been sent.")).toBeVisible();

  await page.goto("/reset-password?token=test-reset-token");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("New password").fill("replacement-password");
  await page.getByLabel("Confirm password").fill("replacement-password");
  await page.getByRole("button", { name: "Update password" }).click();
  await expect(page.getByRole("heading", { name: "Password updated." })).toBeVisible();
  await expect(page.getByText("previous sessions have been revoked")).toBeVisible();
});

test("administrator enrollment requires recovery codes to be saved", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/v1/auth/**", async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/auth/me")) {
      await route.fulfill({ status: 401, json: { error: "authentication required" } });
      return;
    }
    if (path.endsWith("/auth/login")) {
      await route.fulfill({ status: 202, json: {
        mfa_required: true,
        enrollment_required: true,
        challenge_token: "challenge",
        secret: "JBSWY3DPEHPK3PXP",
        otpauth_uri: "otpauth://totp/AKELUWA%20SH:admin@example.com?secret=JBSWY3DPEHPK3PXP&issuer=AKELUWA+SH",
      } });
      return;
    }
    await route.fulfill({ status: 200, json: {
      user: { id: "admin", name: "Admin", email: "admin@example.com", role: "admin", admin_permissions: [], account_active: true, mfa_enabled: true, created_at: "2026-01-01T00:00:00Z" },
      recovery_codes: Array.from({ length: 10 }, (_, index) => `ABCD-EFGH-JKLM-${String(index).padStart(4, "2")}`),
    } });
  });

  await page.goto("/login");
  await page.getByLabel("Email address").fill("admin@example.com");
  await page.getByLabel("Password").fill("correct-horse-battery-staple");
  await page.getByRole("button", { name: "Sign in securely" }).click();
  await expect(page.getByLabel("Authenticator enrollment QR code")).toBeVisible();
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()).violations).toEqual([]);
  await page.getByLabel("Authenticator code").fill("123456");
  await page.getByRole("button", { name: "Enable MFA and continue" }).click();

  const continueButton = page.getByRole("button", { name: "Continue to administration" });
  await expect(page.getByRole("heading", { name: "Save recovery." })).toBeVisible();
  await expect(page.locator(".recovery-code-panel code")).toHaveCount(10);
  await expect(continueButton).toBeDisabled();
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()).violations).toEqual([]);
  await page.getByLabel("I stored these codes securely").check();
  await expect(continueButton).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

for (const width of [360, 390, 768, 1440]) {
  test(`public layouts fit ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/", "/services", "/case-studies", "/contact", "/verify-contract", "/login"]) {
      await page.goto(path);
      await expect(page.locator("main:not(.app-route-loading)")).toBeVisible();
      await expect(page.getByText("Loading published content...", { exact: true })).toHaveCount(0);
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${path} overflows at ${width}px`).toBe(true);
    }
  });
}
