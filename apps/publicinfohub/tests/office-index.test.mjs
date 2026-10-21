import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const read=name=>readFile(new URL("../"+name,import.meta.url),"utf8");

test("index contains every sourced government homepage exactly once",async()=>{
  const [html,officesSource,regionSource,homepage]=await Promise.all([
    "offices/index.html","offices.js","data.js","index.html"
  ].map(read));
  const {offices,regions}=vm.runInNewContext(officesSource+"\n"+regionSource+"\n({offices:GOVERNMENT_OFFICES,regions:NEPAL_REGIONS})");
  assert.equal(offices.length,28);
  assert.equal((html.match(/class="office-index-card"/g)||[]).length,offices.length);
  assert.equal((html.match(/class="province-group"/g)||[]).length,regions.length);
  for(const office of offices){
    assert.ok(html.includes('id="office-'+office.id+'"'),"missing office "+office.id);
    assert.ok(html.includes('href="'+office.website+'"'),"missing government homepage "+office.id);
    assert.ok(html.includes('href="'+office.sourceUrl+'"'),"missing source link "+office.id);
    assert.ok(html.includes('datetime="'+office.checkedOn+'"'),"missing checkedOn "+office.id);
  }
  for(const region of regions){
    assert.ok(html.includes('id="province-'+region.name.toLowerCase()+'"'));
  }
  assert.ok(homepage.includes('id="officeIndexLink" href="offices/"'));
  assert.ok(!html.includes("Government of Nepal-approved"));
});

test("office index uses precise verification language, accessible navigation and correct SEO",async()=>{
  const page=await read("offices/index.html");
  const site="https://www.akeluwasoftwarehub.com.np/publicinfohub/offices/";
  assert.ok(page.includes('<link rel="canonical" href="'+site+'">'));
  assert.ok(page.includes('<meta name="description"'));
  assert.ok(page.includes('<main id="mainContent"'));
  assert.ok(page.includes('aria-label="Jump to province"'));
  assert.ok(page.includes('href="../assets/publicinfohub-favicon.webp"'));
  assert.ok(page.includes("not a government service or nationwide registry"));
  assert.ok(page.includes("It does not verify current fees"));
  const schema=JSON.parse(page.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1]||"{}");
  assert.equal(schema["@type"],"CollectionPage");
  assert.equal(schema.mainEntity["@type"],"ItemList");
  assert.equal(schema.mainEntity.numberOfItems,28);
  assert.equal(schema.mainEntity.itemListElement.length,28);
});
