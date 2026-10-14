import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
const root = new URL("../", import.meta.url);
const source = path => readFile(new URL(path, root), "utf8");
const canonical = "https://www.akeluwasoftwarehub.com.np/publicinfohub/";
const slugs = [
  "bs-ad-date-converter","nepal-age-calculator","nepal-tax-ssf-calculator","official-form-finder",
  "document-checklist-guides","government-office-map","nepal-holiday-calendar","official-exam-portal-directory"
];
test("eight unique indexed utilities are linked from homepage and sitemap", async () => {
  const [home, index, sitemap] = await Promise.all(["index.html","utilities/index.html","sitemap.xml"].map(source));
  for(const slug of slugs) {
    const page = await source("utilities/" + slug + "/index.html");
    const path = "utilities/" + slug + "/";
    assert.ok(home.includes('href="' + path + '"'), "homepage missing " + path);
    assert.ok(index.includes('href="' + slug + '/"'), "utility index missing " + path);
    assert.ok(sitemap.includes("<loc>" + canonical + path + "</loc>"), "sitemap missing " + path);
    assert.ok(page.includes('rel="canonical" href="' + canonical + path + '"'));
    assert.ok(page.includes('src="../utility.js" defer'));
    assert.ok(page.includes('href="../utility.css"'));
    assert.ok(page.includes('href="../../"'));
    assert.ok(page.includes("Independent") || page.includes("independent"));
    assert.ok(!page.includes('type="password"'));
    assert.ok(!page.includes('name="government-payment"'));
  }
  assert.equal((sitemap.match(/<loc>/g)||[]).length, 11);
  assert.ok(home.includes('id="citizen-utilities"'));
  assert.ok(home.includes('href="utilities/"'));
});
test("date converter loads a pinned MIT calendar library and validates input", async () => {
  for(const pagePath of ["bs-ad-date-converter","nepal-age-calculator"]){
    const page = await source("utilities/" + pagePath + "/index.html");
    assert.ok(page.includes("nepali-date-converter@3.4.0/dist/nepali-date-converter.umd.js"));
    assert.ok(page.indexOf("nepali-date-converter@3.4.0") < page.indexOf('src="../utility.js"'));
  }
  const js = await source("utilities/utility.js");
  assert.ok(js.includes("validBS("));
  assert.ok(js.includes("validAD("));
  assert.ok(js.includes("new NepaliDate("));
  assert.ok(js.includes("ageParts("));
});
test("money tool describes rules truthfully and uses inputs, not hardcoded annual tax slabs", async () => {
  const html=await source("utilities/nepal-tax-ssf-calculator/index.html");
  const js=await source("utilities/utility.js");
  assert.ok(html.includes('id="taxWithheld"'));
  assert.ok(html.includes('id="employeeRate"'));
  assert.ok(html.includes('id="employerRate"'));
  assert.ok(html.includes('value="11"') && html.includes('value="20"'));
  assert.ok(html.includes("NOT an official income-tax liability calculator"));
  assert.ok(html.includes("ird.gov.np/category/taxrateincentives"));
  assert.ok(js.includes("Income tax is NOT automatically calculated"));
});
test("forms and checklists never collect applicant identity or passwords",async()=>{
  const js=await source("utilities/utility.js");
  assert.ok(js.includes("FORMS = ["));
  assert.ok(js.includes("CHECKLISTS = ["));
  assert.ok(js.includes("link(item.source"));
  assert.ok(js.includes('el("label")'));
  assert.ok(!js.includes('localStorage'));
  assert.ok(!js.includes('fetch('));
  assert.ok(!js.includes('XMLHttpRequest'));
});
test("maps and recruitment reuse checked first party directory datasets",async()=>{
  const map=await source("utilities/government-office-map/index.html");
  const exams=await source("utilities/official-exam-portal-directory/index.html");
  const js=await source("utilities/utility.js");
  assert.ok(map.includes('src="../../offices.js" defer'));
  assert.ok(exams.includes('src="../../loksewa-data.js" defer'));
  assert.ok(js.includes("GOVERNMENT_OFFICES"));
  assert.ok(js.includes("LOKSEWA_PORTALS"));
  assert.ok(js.includes("www.openstreetmap.org/search?query="));
  assert.ok(js.includes("not a verified building pin"));
  assert.ok(!js.includes("L.marker("));
});
test("calendar links to current published government notice without invented holiday dates",async()=>{
  const page=await source("utilities/nepal-holiday-calendar/index.html");
  const js=await source("utilities/utility.js");
  assert.ok(page.includes("moha.gov.np/en/page/government-and-public-holidays-in-2083"));
  assert.ok(page.includes("id=\"calendarGrid\""));
  assert.ok(js.includes("calendar-today"));
  assert.ok(js.includes("not marked as public holidays"));
});
test("SSF take-home calculations use actual provided inputs", async()=>{
  const elements=new Map();
  const input={monthlyPay:"50000",basicPay:"30000",employeeRate:"11",employerRate:"20",taxWithheld:"2500"};
  for(const [k,v] of Object.entries(input)) elements.set(k,{value:v});
  const result={textContent:"",hidden:true,classList:{toggle(){}}};elements.set("utilityResult",result);
  let callback;
  elements.set("salaryForm",{addEventListener:(type,cb)=>{if(type==="submit")callback=cb;}});
  elements.set("utilityApp",{});
  const context={document:{body:{dataset:{tool:"salary-tax-ssf"}},getElementById:id=>elements.get(id)},Number,String,Date};
  vm.runInNewContext(await source("utilities/utility.js"),context);
  assert.equal(typeof callback,"function");
  callback({preventDefault(){}});
  assert.ok(result.textContent.includes("NPR 3,300")); // 11% of 30,000
  assert.ok(result.textContent.includes("NPR 6,000")); // 20% employer
  assert.ok(result.textContent.includes("NPR 44,200")); // 50,000 - 3,300 - 2,500
  assert.equal(result.hidden,false);
});

test("age calculation handles end-of-month and leap-year inputs without negative days",async()=>{
  const elements=new Map();
  elements.set("utilityApp",{});
  elements.set("ageBirth",{value:"2024-01-31"});
  elements.set("ageReference",{value:"2024-03-01"});
  elements.set("ageCalendar",{value:"ad",addEventListener(){}});
  const result={textContent:"",hidden:true,classList:{toggle(){}}};
  elements.set("utilityResult",result);
  let callback;
  elements.set("ageForm",{addEventListener:(type,cb)=>{if(type==="submit")callback=cb;}});
  vm.runInNewContext(await source("utilities/utility.js"),{
    document:{body:{dataset:{tool:"age"}},getElementById:key=>elements.get(key)},
    Number,String,Date
  });
  callback({preventDefault(){}});
  assert.ok(result.textContent.includes("0 years, 1 months, 1 days"));
  assert.ok(!result.textContent.includes(" -1 days"));
});
