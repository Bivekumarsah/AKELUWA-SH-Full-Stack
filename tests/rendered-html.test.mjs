import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import QRCode from "qrcode";

async function loadWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker;
}

async function renderPath(worker, path) {
  const response = await worker.fetch(
    new Request(`http://localhost${path}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );

  return response.text();
}

test("renders the public homepage and its critical content", async () => {
  const worker = await loadWorker();
  const html = await renderPath(worker, "/");

  assert.match(html, /<title>AKELUWA SH - Software Hub<\/title>/);
  assert.match(html, /aria-label="Primary navigation"/);
  assert.match(html, /Sign in/);
  assert.match(html, /Software built for/);
  assert.doesNotMatch(html, /CORE PULSE|ORIGIN SIGNAL|AKELUWA symbol of trust/);
  assert.doesNotMatch(html, /AKELUWA TRUST STANDARD/);
  assert.doesNotMatch(html, /Secure · Transparent · Accountable/);
  assert.match(html, /Start a project with AKELUWA/);
  assert.match(html, /Skip to main content/);
  assert.match(html, /href="\/akeluwatoolbox\/"/);
  assert.match(html, /Open AkeluwaToolBox/);
  assert.match(html, /href="\/publicinfohub\/"/);
  assert.match(html, /Open PublicInfoHub/);
  assert.doesNotMatch(html, /<script[^>]+src="\/akeluwatoolbox\//);
  assert.match(html, /Loading published content/);
  assert.match(html, /id="contact-form"/);
  assert.match(html, /Use the form/);
  assert.match(html, /mailto:akeluwasoftwarehub@gmail\.com/);
  assert.match(html, /Privacy policy/);
  assert.match(html, /application\/ld\+json/);
  assert.match(html, /rel="icon"[^>]+icon\.png/);
  assert.match(html, /rel="apple-touch-icon"[^>]+apple-icon\.png/);
  assert.doesNotMatch(html, /\/_vinext\/image/);
  assert.doesNotMatch(html, /AKELUWA SYSTEM LAB \/ LIVE/);
  assert.doesNotMatch(html, /gmail\.com\.com/);
});

test('production Worker serves toolbox pages, assets, redirects and isolated 404 responses', async () => {
  const worker = await loadWorker();
  const assetEnv = {
    ASSETS: {
      async fetch(request) {
        let path = new URL(request.url).pathname;
        assert.ok(path.startsWith('/akeluwatoolbox/'));
        if (path.endsWith('/')) path += 'index.html';
        if (path.endsWith('/404')) path += '.html';
        try {
          const data = await readFile(new URL('../dist/client' + path, import.meta.url));
          const type = path.endsWith('.js') ? 'text/javascript' : path.endsWith('.html') ? 'text/html' : 'application/octet-stream';
          return new Response(request.method === 'HEAD' ? null : data, { headers: { 'Content-Type': type } });
        } catch {
          return new Response('Not found', { status: 404 });
        }
      },
    },
  };
  const context = { waitUntil() {}, passThroughOnException() {} };
  const fetch = (path, init) => worker.fetch(new Request('https://www.akeluwasoftwarehub.com.np' + path, init), assetEnv, context);
  for (const path of ['/', '/compress-pdf/', '/compress-photo/', '/jpg-to-pdf/']) {
    const response = await fetch('/akeluwatoolbox' + path);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.ok(html.includes(`data-seo-path="/akeluwatoolbox${path}"`));
    assert.ok(html.includes(`href="https://www.akeluwasoftwarehub.com.np/akeluwatoolbox${path}"`));
  }
  const engine = await fetch('/akeluwatoolbox/assets/vendor/pdfjs/pdf.worker.min.js');
  assert.equal(engine.status, 200);
  assert.equal(engine.headers.get('content-type'), 'text/javascript');
  for (const [path, destination] of [
    ['/akeluwatoolbox', '/akeluwatoolbox/'],
    ['/akeluwatoolbox/compress-photo', '/akeluwatoolbox/compress-photo/'],
    ['/akeluwatoolbox/?tool=photo', '/akeluwatoolbox/compress-photo/'],
  ]) {
    const response = await fetch(path);
    assert.equal(response.status, 308);
    assert.equal(response.headers.get('location'), 'https://www.akeluwasoftwarehub.com.np' + destination);
  }
  const missing = await fetch('/akeluwatoolbox/not-a-tool/');
  assert.equal(missing.status, 404);
  assert.match(await missing.text(), /Page not found/);
  assert.equal((await fetch('/akeluwatoolbox/pdf-reducer/manage.py')).status, 404);
  assert.equal((await fetch('/akeluwatoolbox/', { method: 'POST' })).status, 405);
  assert.equal((await fetch('/akeluwatoolbox/', { method: 'HEAD' })).status, 200);
});

test("PublicInfoHub remains independently deployed rather than bundled into the company Worker", async () => {
  const config = await readFile(new URL("../next.config.ts", import.meta.url), "utf8");
  const buildScript = await readFile(new URL("../scripts/build-static-sites.mjs", import.meta.url), "utf8");
  assert.ok(!config.includes('source: "/publicinfohub"'));
  const proxy = await readFile(new URL("../app/publicinfohub/[[...path]]/route.ts", import.meta.url), "utf8");
  assert.ok(proxy.includes("PUBLIC_INFO_HUB_ORIGIN"));
  assert.ok(proxy.includes("export async function GET"));
  assert.ok(proxy.includes("upstreamUrl.host === incomingUrl.host"));
  assert.ok(proxy.includes("publicinfohub.vercel.app"));
  assert.doesNotMatch(buildScript, /(?:cp|mkdir|rm)\s*\([^\n]*publicinfohub/i);
  assert.match(buildScript, /buildStatic/);
});

test("renders SEO support pages", async () => {
  const worker = await loadWorker();
  const routes = [
    ["/services", /Services built for/],
    ["/about", /A software hub from Nepal/],
    ["/case-studies", /Loading published content/],
    ["/contact", /Start a project with/],
    ["/privacy-policy", /Privacy with/],
    ["/terms", /Clear terms/],
    ["/careers", /Build systems/],
    ["/careers/apply", /Show us how you/],
    ["/downloads", /Resources for a cleaner/],
    ["/verify-contract", /Verify an issued/],
  ];

  for (const [path, expected] of routes) {
    const html = await renderPath(worker, path);
    assert.match(html, expected, `Expected ${path} to render its page content`);
  }
});

test("renders the admin control surface", async () => {
  const worker = await loadWorker();
  const html = await renderPath(worker, "/admin");
  const adminSource = await readFile(new URL("../app/admin/page.tsx", import.meta.url), "utf8");
  const accessSource = await readFile(
    new URL("../app/components/sub-admin-management.tsx", import.meta.url),
    "utf8",
  );
  const reviewSource = await readFile(
    new URL("../app/components/action-review-management.tsx", import.meta.url),
    "utf8",
  );
  const verificationSource = await readFile(
    new URL("../app/components/record-verification-management.tsx", import.meta.url),
    "utf8",
  );

  assert.match(html, /AKELUWA Administration/);
  assert.match(html, /Admin sections/);
  assert.match(html, /overview/i);
  assert.match(html, /Loading your workspace/);
  assert.match(adminSource, /canAccessTab/);
  assert.match(adminSource, /admin-mobile-section-picker/);
  assert.match(adminSource, /admin-sidebar-toggle/);
  assert.match(adminSource, /Open admin navigation/);
  assert.match(adminSource, /aria-label="Admin section"/);
  assert.match(adminSource, /tabLabels/);
  assert.match(adminSource, /"contracts"/);
  assert.match(adminSource, /"verification"/);
  assert.match(adminSource, /<RecordVerificationManagement/);
  assert.match(adminSource, /"downloads"/);
  assert.match(adminSource, /"careers"/);
  assert.match(adminSource, /"accounts"/);
  assert.match(adminSource, /<SubAdminManagement \/>/);
  assert.match(accessSource, /New sub-administrator/);
  assert.match(accessSource, /admin_permissions/);
  assert.match(accessSource, /permission-matrix/);
  assert.match(reviewSource, /Approve action/);
  assert.match(reviewSource, /\/admin\/action-requests/);
  assert.match(verificationSource, /\/admin\/verification-records/);
  assert.match(verificationSource, /New record/);
  assert.doesNotMatch(html, /â|Ã|�/);
});

test("connects the company tagline fields to the public company introduction", async () => {
  const accountSource = await readFile(
    new URL("../app/components/company-account.tsx", import.meta.url),
    "utf8",
  );
  const homeSource = await readFile(
    new URL("../app/page.tsx", import.meta.url),
    "utf8",
  );
  const taglinePosition = accountSource.indexOf("Company tagline");
  const meaningPosition = accountSource.indexOf("Tagline meaning");

  assert.ok(taglinePosition >= 0, "Expected the company tagline field");
  assert.ok(meaningPosition > taglinePosition, "Expected tagline meaning below the tagline");
  assert.match(accountSource, /set\("tagline_meaning"/);
  assert.match(homeSource, /apiFetch<\{ company_brand: CompanyBrand \}>\("\/company-brand"\)/);
  assert.match(homeSource, /companyBrand\.tagline/);
  assert.match(homeSource, /companyBrand\.tagline_meaning/);
  assert.match(homeSource, /className="company-brand-tagline"/);
  assert.match(homeSource, /className="brand-tagline-meaning"/);
});

test("gates guest authentication screens behind a session check", async () => {
  const worker = await loadWorker();

  for (const path of ["/login", "/register"]) {
    const html = await renderPath(worker, path);
    assert.match(html, /Checking your secure session/);
    assert.doesNotMatch(html, /<form/);
  }
});

test("links client invoices to authenticated account access", async () => {
  const accountSource = await readFile(new URL("../app/account/page.tsx", import.meta.url), "utf8");
  const accountingSource = await readFile(new URL("../app/components/accounting-management.tsx", import.meta.url), "utf8");
  const apiSource = await readFile(new URL("../backend/internal/httpapi/api.go", import.meta.url), "utf8");
  const storeSource = await readFile(new URL("../backend/internal/store/store.go", import.meta.url), "utf8");

  assert.match(accountSource, /\/account\/invoices/);
  assert.match(accountingSource, /user_id: invoiceDraft\.user_id/);
  assert.match(apiSource, /GET \/api\/v1\/account\/invoices/);
  assert.match(apiSource, /ListInvoicesForUser/);
  assert.match(storeSource, /WHERE i\.user_id=\$1/);
});

test("generates authenticator enrollment QR codes locally", async () => {
  const image = await QRCode.toDataURL(
    "otpauth://totp/AKELUWA%20SH:admin@example.com?secret=JBSWY3DPEHPK3PXP&issuer=AKELUWA+SH",
  );

  assert.match(image, /^data:image\/png;base64,/);
});
