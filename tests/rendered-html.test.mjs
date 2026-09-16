import assert from "node:assert/strict";
import test from "node:test";

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
  assert.match(html, /Start a project with AKELUWA/);
  assert.match(html, /Skip to contact/);
  assert.match(html, /Traceable money movement/);
  assert.match(html, /id="contact-form"/);
  assert.match(html, /Use the form/);
  assert.match(html, /mailto:akeluwasoftwarehub@gmail\.com/);
  assert.match(html, /privacy policy/);
  assert.match(html, /application\/ld\+json/);
  assert.match(html, /rel="icon"[^>]+icon\.png/);
  assert.match(html, /rel="apple-touch-icon"[^>]+apple-icon\.png/);
  assert.doesNotMatch(html, /\/_vinext\/image/);
  assert.doesNotMatch(html, /AKELUWA SYSTEM LAB \/ LIVE/);
  assert.doesNotMatch(html, /gmail\.com\.com/);
});

test("renders SEO support pages", async () => {
  const worker = await loadWorker();
  const routes = [
    ["/services", /Services built for/],
    ["/about", /A software hub from Nepal/],
    ["/case-studies", /Fintech transaction platform/],
    ["/contact", /Start a project with/],
    ["/privacy-policy", /Privacy with/],
    ["/terms", /Clear terms/],
    ["/careers", /Build systems/],
    ["/careers/apply", /Show us how you/],
    ["/downloads", /Resources for a cleaner/],
  ];

  for (const [path, expected] of routes) {
    const html = await renderPath(worker, path);
    assert.match(html, expected, `Expected ${path} to render its page content`);
  }
});

test("renders the admin control surface", async () => {
  const worker = await loadWorker();
  const html = await renderPath(worker, "/admin");

  assert.match(html, /AKELUWA CONTROL \/ LIVE/);
  assert.match(html, /Admin sections/);
  assert.match(html, /contracts/i);
  assert.match(html, /downloads/i);
  assert.match(html, /careers/i);
  assert.match(html, /Loading the control system/);
  assert.doesNotMatch(html, /â|Ã|�/);
});

test("gates guest authentication screens behind a session check", async () => {
  const worker = await loadWorker();

  for (const path of ["/login", "/register"]) {
    const html = await renderPath(worker, path);
    assert.match(html, /Checking your secure session/);
    assert.doesNotMatch(html, /<form/);
  }
});
