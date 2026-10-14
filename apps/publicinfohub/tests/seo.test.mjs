import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = name => readFile(new URL("../" + name, import.meta.url), "utf8");
const canonical = "https://www.akeluwasoftwarehub.com.np/publicinfohub/";

test("PublicInfoHub uses one canonical company-domain URL, with descriptive metadata", async () => {
  const html = await source("index.html");
  assert.equal((html.match(/rel="canonical"/g) || []).length, 1);
  assert.ok(html.includes('rel="canonical" href="' + canonical + '"'));
  assert.ok(html.includes('property="og:url" content="' + canonical + '"'));
  assert.ok(html.includes('property="og:site_name" content="AKELUWA PublicInfoHub"'));
  assert.ok(html.includes('property="og:image" content="' + canonical + 'assets/publicinfohub-logo.webp"'));
  assert.ok(html.includes('name="twitter:card" content="summary"'));
  assert.ok(html.includes('name="robots" content="index,follow'));
  assert.ok(html.includes("independent directory"));
  const description = html.match(/<meta name="description" content="([^"]+)"/);
  assert.ok(description && description[1].length >= 80 && description[1].length <= 180);
  assert.ok(!html.includes('government-approved'));
});

test("SEO structured data describes an independent directory, not a government agency", async () => {
  const html = await source("index.html");
  const scripts = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length, 1);
  const schema = JSON.parse(scripts[0][1]);
  assert.equal(schema["@context"], "https://schema.org");
  const entities = schema["@graph"];
  assert.ok(entities.some(item => item["@type"] === "WebSite" && item.url === canonical));
  assert.ok(entities.some(item => item["@type"] === "CollectionPage" && item.url === canonical));
  assert.ok(!entities.some(item => ["GovernmentOrganization","GovernmentOffice"].includes(item["@type"])));
});

test("Sitemap contains real canonical pages and nested Vercel routing stays supported", async () => {
  const sitemap = await source("sitemap.xml");
  const robots = await source("robots.txt");
  const deployment = JSON.parse(await source("vercel.json"));
  assert.equal((sitemap.match(/<loc>/g) || []).length, 11);
  assert.ok(sitemap.includes("<loc>" + canonical + "offices/</loc>"));
  assert.ok(sitemap.includes("<loc>" + canonical + "utilities/</loc>"));
  assert.ok(sitemap.includes("<loc>" + canonical + "</loc>"));
  assert.ok(!sitemap.includes("https://publicinfohub.vercel.app/"));
  const directory=await source("offices/index.html");
  assert.ok(directory.includes('<link rel="canonical" href="' + canonical + 'offices/">'));
  assert.ok(directory.includes('href="../styles.css"'));
  assert.ok((await source("index.html")).includes('href="offices/"'));
  assert.ok(robots.includes("Sitemap: " + canonical + "sitemap.xml"));
  assert.ok(deployment.rewrites.some(route => route.source === "/publicinfohub/:path*" && route.destination === "/:path*"));
  const routes = new Set(deployment.headers.map(item => item.source));
  for(const name of ["styles.css","data.js","offices.js","i18n.js","app.js","assets/publicinfohub-logo.webp"]) {
    assert.ok(routes.has("/publicinfohub/" + name), "missing nested asset cache path: " + name);
    assert.ok(routes.has("/" + name), "missing standalone asset cache path: " + name);
  }
});

test("Existing bilingual dependencies execute in order; essential logo loads eagerly", async () => {
  const html = await source("index.html");
  const scripts = [...html.matchAll(/<script src="([^"]+)" defer><\/script>/g)].map(match => match[1]);
  assert.deepEqual(scripts, ["data.js","offices.js","i18n.js","share.js","office-discovery.js","app.js","loksewa-data.js","loksewa.js"]);
  assert.ok(html.includes('class="brand-logo" src="assets/publicinfohub-logo.webp" fetchpriority="high"'));
  assert.ok(html.includes('id="langSwitch"'));
  assert.ok(html.includes('id="officeGrid"'));
});
