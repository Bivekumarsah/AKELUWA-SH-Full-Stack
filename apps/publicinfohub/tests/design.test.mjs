import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const read=name=>readFile(new URL("../"+name,import.meta.url),"utf8");

test("Phase 13 keeps real directory entry points and logo intact",async()=>{
 const html=await read("index.html");
 for(const id of ["mainContent","primaryNav","langSwitch","searchForm","searchInput","categories","provinces-section","provinces","districts","services","serviceGrid","offices","officeGrid","officeSearch","loksewa","loksewaGrid","about"])
   assert.ok(html.includes('id="'+id+'"'),"missing existing "+id);
 assert.ok(html.includes('class="brand-logo" src="assets/publicinfohub-logo.webp"'));
 assert.ok(html.includes('href="#loksewa"'));
 assert.ok(!html.includes('akeluwasoftwarehub.gov.np'));
 assert.ok(!html.includes("© 2024"));
});
test("Phase 13 provides substantive footer routes, site notices, and transparent ownership",async()=>{
 const html=await read("index.html");
 for(const id of ["footer","privacy","terms","accessibility","sources","about","footerYear"])
   assert.ok(html.includes('id="'+id+'"'));
 for(const target of ["#privacy","#terms","#accessibility","#sources","#mainContent","#loksewa","#offices"])
   assert.ok(html.includes('href="'+target+'"'));
 assert.ok(html.includes("https://www.akeluwasoftwarehub.com.np/"));
 assert.ok(html.includes("We are not a government agency."));
 assert.ok(html.includes("External")||html.includes("external link"));
 assert.ok(html.includes("Search and filters run in your browser."));
 assert.ok(!html.includes("mailto:")&&!html.includes("example.com"));
});
test("Phase 13 styles responsive, readable, keyboard-accessible UI",async()=>{
 const css=await read("styles.css");
 const i18n=await read("i18n.js");
 assert.ok(css.includes(".category-grid"));
 assert.ok(css.includes(".footer-layout"));
 assert.ok(css.includes(".policy-grid"));
 assert.ok(css.includes(":focus-visible"));
 assert.ok(css.includes("prefers-reduced-motion"));
 assert.ok(css.includes("@media(max-width:580px)"));
 assert.ok(i18n.includes('"Privacy notice":"गोपनीयता सूचना"'));
 assert.ok(i18n.includes('Public services, offices, and<br><span>official links — in one trusted place.</span>'));
 assert.ok(i18n.includes('const icon=el.querySelector(".stat-icon")'));
});

test("Nepal heritage hero is original local artwork and all six categories are functional",async()=>{
 const html=await read("index.html");
 const css=await read("styles.css");
 const app=await read("app.js");
 const words=await read("i18n.js");
 // The heritage SVG was intentionally replaced with responsive local WebP art.
 // Check real image bytes and references, instead of requiring a removed asset.
 const desktop=await readFile(new URL("../assets/nepal-temple-banner.webp",import.meta.url));
 const mobile=await readFile(new URL("../assets/nepal-temple-banner-mobile.webp",import.meta.url));
 for(const image of [desktop,mobile]){
   assert.ok(image.length>1000,"hero image must be non-empty");
   assert.equal(image.toString("ascii",0,4),"RIFF","hero image must have a WebP RIFF header");
   assert.equal(image.toString("ascii",8,12),"WEBP","hero image must actually be WebP");
 }
 assert.ok(css.includes('url("assets/nepal-temple-banner.webp")'));
 assert.ok(css.includes('url("assets/nepal-temple-banner-mobile.webp")'));
 assert.ok(!css.includes("nepal-heritage-hero.svg"),"removed artwork cannot remain referenced");
 assert.equal((html.match(/class="symbol icon-/g)||[]).length,6);
 assert.ok(html.includes('class="symbol icon-local"'));
 assert.ok(app.includes('if(index===5){$("provinces-section").scrollIntoView'));
 assert.ok(words.includes('"Local Services":"स्थानीय सेवाहरू"'));
 assert.ok(app.includes("province-icon"));
 assert.ok(!html.includes("akeluwasoftwarehub.gov.np"));
});
