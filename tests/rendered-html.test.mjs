import assert from "node:assert/strict";
import test from "node:test";

test("renders the public homepage and its critical content", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/", {
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
  const html = await response.text();
  assert.match(html, /<title>AKELUWA SH — Software Hub<\/title>/);
  assert.match(html, /aria-label="Primary navigation"/);
  assert.match(html, /Start a project with AKELUWA/);
  assert.match(html, /Skip to contact/);
  assert.match(html, /Traceable money movement/);
  assert.match(html, /id="contact-form"/);
  assert.match(html, /Use the form/);
  assert.match(html, /mailto:akeluwasoftwarehub@gmail\.com/);
  assert.match(html, /When you submit an inquiry, we store the details you provide/);
  assert.match(html, /rel="icon"[^>]+icon\.png/);
  assert.match(html, /rel="apple-touch-icon"[^>]+apple-icon\.png/);
  assert.doesNotMatch(html, /\/_vinext\/image/);
  assert.doesNotMatch(html, /AKELUWA SYSTEM LAB \/ LIVE/);
  assert.doesNotMatch(html, /gmail\.com\.com/);
});
