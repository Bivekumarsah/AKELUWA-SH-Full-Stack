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
    if (path.endsWith(`/account/contracts/${contract.id}/sign`) && route.request().method() === "POST") return route.fulfill({ json: { contract: { ...contract, status: "active", client_signer_name: user.name, client_signature: legacySignaturePNG, client_signed_at: "2026-09-29T09:30:00Z", updated_at: "2026-09-29T09:30:00Z" } } });
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
  await expect(page.getByLabel("Contract verification QR code")).toBeVisible();
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

  await page.getByRole("button", { name: "Type", exact: true }).click();
  await expect(page.getByLabel("Typed legal signature")).toHaveValue(user.name);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Accept and sign contract" }).click();
  await expect(page.getByText("Signature pending")).toHaveCount(0);
  await expect(page.getByText(/Accepted .*2026/)).toHaveCount(2);
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

test("public verification matches an issued contract without exposing client data", async ({ page }) => {
  await page.route("**/api/v1/contracts/verify**", async route => route.fulfill({ json: { verification: {
    contract_number: contract.contract_number,
    title: contract.title,
    status: "active",
    version: contract.version,
    content_hash: contract.content_hash,
    provider_name: contract.provider_legal_name,
    provider_signed_at: contract.provider_signed_at,
    client_signed_at: "2026-09-29T09:30:00Z",
    issued_at: contract.sent_at,
  } } }));

  await page.goto(`/verify-contract?number=${contract.contract_number}&fingerprint=${contract.content_hash}`);
  await expect(page.getByText("VERIFIED AKELUWA SH RECORD")).toBeVisible();
  await expect(page.getByRole("heading", { name: contract.contract_number })).toBeVisible();
  await expect(page.getByText(contract.content_hash)).toBeVisible();
  await expect(page.getByText(contract.client_email)).toHaveCount(0);
  await expect(page.getByText("NPR 125,000.00")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("public verification confirms a registered company record by ID", async ({ page }) => {
  await page.route("**/api/v1/records/verify**", async route => route.fulfill({ json: { verification: {
    verification_code: "AK-CERT-2026-0042",
    record_type: "certificate",
    title: "Cloud Security Completion",
    holder_name: "Example Person",
    issued_on: "2026-09-01",
    expires_on: "2027-09-01",
    status: "valid",
    public_note: "Issued after successful assessment.",
    provider_name: "Akeluwa Software Hub Pvt. Ltd.",
  } } }));

  await page.goto("/verify-contract?code=AK-CERT-2026-0042");
  await expect(page.getByText("VERIFIED AKELUWA SH RECORD")).toBeVisible();
  await expect(page.getByRole("heading", { name: "AK-CERT-2026-0042" })).toBeVisible();
  await expect(page.getByText("Example Person")).toBeVisible();
  await expect(page.getByText("Issued after successful assessment.")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("public verification gives contact guidance for an unknown ID", async ({ page }) => {
  await page.route("**/api/v1/records/verify**", async route => route.fulfill({ status: 404, json: { error: "not registered" } }));

  await page.goto("/verify-contract?code=AK-UNKNOWN-9000");
  await expect(page.getByText("Not an AKELUWA SH verified record")).toBeVisible();
  await expect(page.getByRole("link", { name: /Contact akeluwasoftwarehub@gmail.com/ })).toHaveAttribute("href", "mailto:akeluwasoftwarehub@gmail.com");
});

test("administrator can issue a public verification ID", async ({ page }) => {
  const admin = { ...user, id: "33333333-3333-4333-8333-333333333333", name: "Admin Example", email: "admin@example.com", role: "admin", mfa_enabled: true };
  await page.route("**/api/v1/**", async route => {
    const path = new URL(route.request().url()).pathname;
    const method = route.request().method();
    if (path.endsWith("/auth/me")) return route.fulfill({ json: { user: admin } });
    if (path.endsWith("/admin/stats")) return route.fulfill({ json: { stats: { users: 1, new_inquiries: 0, active_services: 0, active_projects: 0 } } });
    if (path.endsWith("/admin/inquiries")) return route.fulfill({ json: { inquiries: [] } });
    if (path.endsWith("/admin/services")) return route.fulfill({ json: { services: [] } });
    if (path.endsWith("/admin/portfolio")) return route.fulfill({ json: { portfolio: [] } });
    if (path.endsWith("/admin/users")) return route.fulfill({ json: { users: [admin] } });
    if (path.endsWith("/admin/contracts")) return route.fulfill({ json: { contracts: [] } });
    if (path.endsWith("/admin/client-options")) return route.fulfill({ json: { users: [] } });
    if (path.endsWith("/admin/verification-records") && method === "GET") return route.fulfill({ json: { verification_records: [] } });
    if (path.endsWith("/admin/verification-records") && method === "POST") {
      const body = route.request().postDataJSON();
      return route.fulfill({ status: 201, json: { verification_record: { ...body, id: "44444444-4444-4444-8444-444444444444", created_at: "2026-09-29T00:00:00Z", updated_at: "2026-09-29T00:00:00Z" } } });
    }
    return route.fulfill({ status: 404, json: { error: "not mocked" } });
  });

  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "System overview" })).toBeVisible();
  await page.getByRole("button", { name: "Open admin navigation" }).click();
  await page.getByRole("button", { name: /Verification/ }).click();
  await expect(page.getByRole("heading", { name: "Record verification" })).toBeVisible();
  await page.getByRole("button", { name: "New record" }).click();
  await page.getByLabel("Verification ID").fill("AK-CERT-2026-0099");
  await page.getByLabel("Public title").fill("Production Readiness Certificate");
  await page.getByLabel(/Issued to/).fill("Example Organization");
  await page.getByRole("button", { name: "Issue record" }).click();
  await expect(page.getByText("Verification record issued.")).toBeVisible();
  await expect(page.getByText("AK-CERT-2026-0099")).toBeVisible();
});

test("account keeps successful sections available and retries a failed contract request", async ({ page }) => {
  let contractAttempts = 0;
  await page.route("**/api/v1/**", async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/auth/me")) return route.fulfill({ json: { user } });
    if (path.endsWith("/account/inquiries")) return route.fulfill({ json: { inquiries: [] } });
    if (path.endsWith("/account/invoices")) return route.fulfill({ json: { invoices: [] } });
    if (path.endsWith("/account/contracts")) {
      contractAttempts += 1;
      return contractAttempts === 1
        ? route.fulfill({ status: 503, json: { error: "temporarily unavailable" } })
        : route.fulfill({ json: { contracts: [contract] } });
    }
    return route.fulfill({ status: 404, json: { error: "not mocked" } });
  });

  await page.goto("/account");
  await expect(page.getByText(user.email)).toBeVisible();
  await expect(page.getByText(/temporarily unavailable: contracts/)).toBeVisible();
  await expect(page.getByText("No invoices have been issued to this account.")).toBeVisible();
  await page.locator(".account-contracts").getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("button", { name: /Commerce platform design and development/ })).toBeVisible();
});
