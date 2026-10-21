import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const read = name => readFile(new URL("../" + name, import.meta.url), "utf8");

test("Nepal geographic index has all seven provinces and 77 unique districts", async () => {
  const data = await read("data.js");
  const regions = vm.runInNewContext(data + "\nNEPAL_REGIONS");
  assert.equal(regions.length, 7);
  const districts = regions.flatMap(region => region.districts);
  assert.equal(districts.length, 77);
  assert.equal(new Set(districts).size, 77);
  for (const region of regions) {
    assert.ok(region.name && region.districts.length > 0);
  }
});

test("all sample service links use HTTPS and the directory avoids unverified fees", async () => {
  const source = await read("app.js");
  const services = vm.runInNewContext(source.split("\nlet query")[0] + "\nservices");
  assert.ok(services.length >= 6);
  for (const item of services) {
    const url = new URL(item.url);
    assert.equal(url.protocol, "https:");
    assert.ok(item.id && item.name && item.agency && item.scope);
  }
  const html = await read("index.html");
  assert.match(html, /government office records and application guidance require independent source checks/i);
});

test("nested Vercel deployment still includes required browser assets", async () => {
  const config = JSON.parse(await read("vercel.json"));
  for (const path of ["/publicinfohub/", "/publicinfohub/:path*"]) {
    assert.ok(config.rewrites.some(route => route.source === path));
  }
  const html = await read("index.html");
  assert.ok(html.includes('src="data.js"'));
  assert.ok(html.includes('src="app.js"'));
  assert.ok(html.includes('id="districts"'));
});
