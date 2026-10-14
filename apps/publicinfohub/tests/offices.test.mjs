import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = name => readFile(new URL("../" + name, import.meta.url), "utf8");

test("all published offices have unique IDs, homepage sources and check dates", async () => {
  const offices = vm.runInNewContext((await source("offices.js")) + "\nGOVERNMENT_OFFICES");
  assert.equal(offices.length, 28);
  assert.equal(new Set(offices.map(record => record.id)).size, offices.length);
  for (const record of offices) {
    assert.ok(["Federal","Local"].includes(record.level));
    assert.ok(record.district && record.province);
    assert.equal(record.status, "homepage-verified");
    assert.equal(Number.isNaN(Date.parse(record.checkedOn)), false);
    assert.equal(record.checkedOn, "2026-10-09");
    assert.ok(record.name && record.nameNe && record.city && record.description);
    const official = new URL(record.website);
    const cited = new URL(record.sourceUrl);
    assert.equal(official.protocol, "https:");
    assert.equal(cited.protocol, "https:");
    assert.equal(cited.hostname.replace("www.", ""), official.hostname.replace("www.", ""));
    assert.ok(official.hostname.endsWith(".gov.np"));
  }
  assert.equal(offices.filter(office => office.level === "Local").length, 21);
  assert.equal(offices.filter(office => office.level === "Federal").length, 7);
  assert.equal(new Set(offices.filter(office => office.level === "Local").map(office => office.province)).size, 7);
  assert.ok(new Set(offices.filter(office => office.level === "Local").map(office => office.district)).size >= 13);
  const regions = vm.runInNewContext((await source("data.js")) + "\nNEPAL_REGIONS");
  const allDistricts = new Set(regions.flatMap(region => region.districts));
  for (const office of offices) {
    assert.ok(regions.some(region => region.name === office.province && region.districts.includes(office.district)));
    assert.ok(allDistricts.has(office.district));
  }
});

test("office records are wired into the nested deployment", async () => {
  const html = await source("index.html");
  const app = await source("app.js");
  assert.ok(html.includes('src="offices.js"'));
  assert.ok(html.includes('id="officeGrid"'));
  assert.ok(html.includes('id="officeSearch"'));
  assert.ok(html.includes('id="officeProvince"'));
  assert.ok(html.includes('id="officeSummary"'));
  assert.ok(html.includes('id="resetOfficeFilters"'));
  assert.ok(html.includes('id="officeDistrict"'));
  assert.ok(html.includes('id="officeLevel"'));
  assert.ok(app.includes('office.province === officeProvince'));
  assert.ok(app.includes("initOfficeFilters()"));
  assert.ok(app.includes('$("resetOfficeFilters").addEventListener'));
  assert.ok(app.includes('$("officeSummary").textContent'));
  assert.ok(app.includes('office.district === officeDistrict'));
  assert.ok(app.includes('office.level === officeLevel'));
  assert.ok(app.includes("renderOffices()"));
  assert.ok(app.includes("escapeHtml(uiOfficeName(office))"));
  assert.ok(app.includes("escapeHtml(office.website)"));
  assert.ok(html.indexOf('src="offices.js"') < html.indexOf('src="app.js"'));
});

test("PublicInfoHub logo and favicon assets are linked and present", async () => {
  const html = await source("index.html");
  const style = await source("styles.css");
  const logo = await readFile(new URL("../assets/publicinfohub-logo.webp", import.meta.url));
  const favicon = await readFile(new URL("../assets/publicinfohub-favicon.webp", import.meta.url));
  assert.match(html, /class="brand-logo"/);
  assert.ok(html.includes('assets/publicinfohub-logo.webp'));
  assert.ok(html.includes('rel="icon" type="image/webp"'));
  assert.ok(html.includes('assets/publicinfohub-favicon.webp'));
  assert.ok(style.includes('.brand-logo'));
  assert.equal(logo.subarray(0, 4).toString(), "RIFF");
  assert.equal(logo.subarray(8, 12).toString(), "WEBP");
  assert.equal(favicon.subarray(0, 4).toString(), "RIFF");
  assert.equal(favicon.subarray(8, 12).toString(), "WEBP");
});

test("Phase 7 navigation and directory search work with accessible markup", async () => {
  const html = await source("index.html");
  const script = await source("app.js");
  const css = await source("styles.css");
  assert.ok(html.includes('class="skip-link" href="#mainContent"'));
  assert.ok(html.includes('id="menuToggle"'));
  assert.ok(html.includes('aria-controls="primaryNav"'));
  assert.ok(html.includes('id="primaryNav"'));
  assert.ok(html.includes('id="mainContent"'));
  assert.ok(html.includes('role="search"'));
  assert.ok(html.includes('href="#offices"'));
  assert.ok(script.includes('menuToggle.addEventListener("click"'));
  assert.ok(script.includes('link.addEventListener("click", closeMenu)'));
  assert.ok(script.includes('const officeMatches=GOVERNMENT_OFFICES.some'));
  assert.ok(script.includes('if(index===3){$("offices").scrollIntoView'));
  assert.ok(css.includes('.links.open{display:flex}'));
  assert.ok(css.includes('.skip-link:focus'));
  assert.ok(css.includes('prefers-reduced-motion:reduce'));
});

test("Phase 8 includes five newly checked local-government homepages", async () => {
  const offices = vm.runInNewContext((await source("offices.js")) + "\nGOVERNMENT_OFFICES");
  const additions = [
    ["dharan-submetro", "Koshi", "Sunsari", "dharan.gov.np"],
    ["damak-municipality", "Koshi", "Jhapa", "damakmun.gov.np"],
    ["dhulikhel-municipality", "Bagmati", "Kavrepalanchok", "dhulikhelmun.gov.np"],
    ["banepa-municipality", "Bagmati", "Kavrepalanchok", "banepamun.gov.np"],
    ["nepalgunj-submetro", "Lumbini", "Banke", "nepalgunjmun.gov.np"]
  ];
  for (const [id, province, district, hostname] of additions) {
    const record = offices.find(office => office.id === id);
    assert.ok(record, "missing checked office " + id);
    assert.equal(record.level, "Local");
    assert.equal(record.province, province);
    assert.equal(record.district, district);
    assert.equal(new URL(record.website).hostname, hostname);
    assert.equal(new URL(record.sourceUrl).hostname.replace("www.", ""), hostname);
  }
});

test("Phase 8 district browsing links only to indexed local-government offices", async () => {
  const html = await source("index.html");
  const app = await source("app.js");
  const style = await source("styles.css");
  assert.ok(html.includes('id="districtOfficeAction" hidden'));
  assert.ok(html.includes("Not every district has an indexed office."));
  assert.ok(app.includes('office.level === "Local" && office.province === province && office.district === district'));
  assert.ok(app.includes('districtOfficeAction.hidden = !district || localOffices.length === 0'));
  assert.ok(app.includes('function openSelectedDistrictOffices()'));
  assert.ok(app.includes('$("officeLevel").value = "Local";'));
  assert.ok(app.includes('$("officeProvince").dispatchEvent(new Event("change"))'));
  assert.ok(app.includes('$("officeDistrict").value = district;'));
  assert.ok(style.includes('.district-office-action[hidden]{display:none!important}'));
});

test("Phase 9 provides bilingual UI without mutating office records", async () => {
  const html = await source("index.html");
  const app = await source("app.js");
  const translations = await source("i18n.js");
  const css = await source("styles.css");
  assert.ok(html.includes('id="langSwitch"'));
  assert.ok(html.includes('src="i18n.js"'));
  assert.ok(html.indexOf('src="i18n.js"') < html.indexOf('src="app.js"'));
  assert.ok(translations.includes('document.documentElement.lang = uiLanguage'));
  assert.ok(translations.includes('const uiOfficeName = office'));
  assert.ok(translations.includes('const uiProvince = value'));
  assert.ok(translations.includes('not operated, affiliated with') || translations.includes('यो नेपाल सरकारद्वारा सञ्चालित'));
  assert.ok(app.includes('$("langSwitch").addEventListener("click"'));
  assert.ok(app.includes('uiLanguage = uiLanguage === "en" ? "ne" : "en"'));
  assert.ok(app.includes('translateStaticUi();'));
  assert.ok(app.includes('escapeHtml(uiOfficeName(office))'));
  assert.ok(app.includes('escapeHtml(uiText(item.name))'));
  assert.ok(css.includes('.language-switch'));
  const offices = vm.runInNewContext((await source("offices.js")) + "\nGOVERNMENT_OFFICES");
  assert.equal(offices.length, 28);
});

test("Phase 9 dictionary switches languages and uses Devanagari digits", async () => {
  const dictionary = await source("i18n.js");
  const english = vm.runInNewContext(dictionary + "\nuiText('Government Offices')");
  const nepali = vm.runInNewContext(dictionary + "\nuiLanguage='ne';[uiText('Government Offices'), uiProvince('Bagmati'), uiDigits(28)]");
  assert.equal(english, "Government Offices");
  assert.equal(nepali[0], "सरकारी कार्यालयहरू");
  assert.equal(nepali[1], "बागमती");
  assert.equal(nepali[2], "२८");
});
