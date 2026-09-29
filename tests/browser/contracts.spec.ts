import { expect, type Page, test } from "@playwright/test";
import { Buffer } from "node:buffer";

const user = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Client Example",
  email: "client@example.com",
  role: "user",
  admin_permissions: [],
  account_active: true,
  mfa_enabled: false,
  created_at: "2026-01-01T00:00:00Z",
};

const legacySignaturePNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

const contract = {
  id: "22222222-2222-4222-8222-222222222222",
  user_id: user.id,
  contract_number: "AK-2026-000101",
  title: "Commerce platform design and development",
  client_name: user.name,
  client_email: user.email,
  client_company: "Example Trading Pvt. Ltd.",
  provider_name: "AKELUWA SH",
  provider_legal_name: "Akeluwa Software Hub Pvt. Ltd.",
  provider_email: "contracts@akeluwa.com",
  provider_phone: "+977 9800000000",
  provider_website: "https://akeluwa.com",
  provider_registration_number: "REG-2026-101",
  provider_tax_id: "PAN-101010",
  provider_address: "Kathmandu, Bagmati, Nepal",
  currency: "NPR",
  amount_cents: 12500000,
  start_date: "2026-10-01",
  end_date: "2026-12-15",
  scope: "Design and build the agreed responsive commerce platform and administration tools.",
  deliverables: "Production application, source code, deployment configuration, and handover documentation.",
  milestones: "Discovery, interface approval, development, acceptance review, and production launch.",
  payment_terms: "Forty percent deposit, thirty percent after design approval, and balance on acceptance.",
  revision_terms: "Two revision rounds are included for each design milestone.",
  support_terms: "Thirty days of defect support are included after launch.",
  ownership_terms: "Custom deliverables transfer to the client after full payment.",
  confidentiality_terms: "Both parties protect non-public project and business information.",
  termination_terms: "Material breach requires written notice and a reasonable cure period.",
  dispute_terms: "The parties first attempt good-faith negotiation before formal proceedings.",
  special_terms: "Production access must use named accounts with multi-factor authentication.",
  status: "pending",
  version: 3,
  content_hash: "4f3cb2cb64a5730dd31078784d7c66d8d2076f919235a18f654b22606808ce15",
  provider_signer_name: "Authorized Provider",
  provider_signature: legacySignaturePNG,
  provider_signed_at: "2026-09-29T08:15:00Z",
  client_signer_name: "",
  client_signature: "",
  sent_at: "2026-09-29T08:00:00Z",
  created_at: "2026-09-28T08:00:00Z",
  updated_at: "2026-09-29T08:15:00Z",
};

async function mockAccount(page: Page) {
  await page.route("**/api/v1/**", async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/auth/me")) return route.fulfill({ json: { user } });
    if (path.endsWith("/account/inquiries")) return route.fulfill({ json: { inquiries: [] } });
    if (path.endsWith("/account/invoices")) return route.fulfill({ json: { invoices: [] } });
    if (path.endsWith("/account/contracts")) return route.fulfill({ json: { contracts: [contract] } });
    return route.fulfill({ status: 404, json: { error: "not mocked" } });
  });
}

test("client contract is branded, traceable, responsive, and supports signature history", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockAccount(page);

  await page.goto("/account");
  await page.getByRole("button", { name: /Commerce platform design and development/ }).click();

  await expect(page.getByRole("img", { name: "AKELUWA SH" })).toBeVisible();
  await expect(page.getByText("Akeluwa Software Hub Pvt. Ltd.").first()).toBeVisible();
  await expect(page.getByText(contract.content_hash).first()).toBeVisible();
  await expect(page.getByText("CONTROLLED CONTRACT COPY")).toBeAttached();
  await expect(page.locator(".contract-signatures img")).toHaveCSS("filter", "brightness(0) saturate(1)");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  const canvas = page.getByLabel("Signature drawing area");
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  if (!box) throw new Error("signature canvas has no layout box");
  await page.mouse.move(box.x + 35, box.y + 95);
  await page.mouse.down();
  await page.mouse.move(box.x + 90, box.y + 55, { steps: 6 });
  await page.mouse.move(box.x + 150, box.y + 110, { steps: 6 });
  await page.mouse.up();
  await expect(page.getByText("1 stroke recorded")).toBeVisible();

  await page.getByRole("button", { name: "Undo last signature stroke" }).click();
  await expect(page.getByText("Sign inside the area above")).toBeVisible();
  await page.getByRole("button", { name: "Redo signature stroke" }).click();
  await expect(page.getByText("1 stroke recorded")).toBeVisible();
  await page.getByRole("button", { name: "Erase signature" }).click();
  await expect(page.getByText("Sign inside the area above")).toBeVisible();
});

test("contract paper uses the full readable desktop measure", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await mockAccount(page);
  await page.goto("/account");
  await page.getByRole("button", { name: /Commerce platform design and development/ }).click();
  const paper = page.locator(".contract-paper");
  await paper.scrollIntoViewIfNeeded();
  const bounds = await paper.boundingBox();
  expect(bounds?.width).toBeGreaterThan(850);
  expect(bounds?.width).toBeLessThanOrEqual(940);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("print output includes the complete multi-page contract", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await mockAccount(page);
  await page.goto("/account");
  await page.getByRole("button", { name: /Commerce platform design and development/ }).click();
  await page.emulateMedia({ media: "print" });

  const printLayout = await page.locator(".contract-paper").evaluate(element => {
    const style = getComputedStyle(element);
    return { overflow: style.overflow, height: element.scrollHeight };
  });
  expect(printLayout.overflow).toBe("visible");
  expect(printLayout.height).toBeGreaterThan(1120);
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)).toBe("rgb(255, 255, 255)");

  const pdf = await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true });
  const pageCount = Buffer.from(pdf).toString("latin1").match(/\/Type\s*\/Page\b/g)?.length || 0;
  expect(pageCount).toBeGreaterThan(1);
});
