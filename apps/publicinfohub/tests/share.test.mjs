import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
const load=name=>readFile(new URL("../"+name,import.meta.url),"utf8");
const helpers=async()=>vm.runInNewContext((await load("share.js"))+"\n({readOfficeLink,makeOfficeLink})",{URL,URLSearchParams});
const data=async()=>vm.runInNewContext((await load("offices.js"))+"\nGOVERNMENT_OFFICES");

test("shared office URLs preserve the publicinfohub route and any unrelated params",async()=>{
  const {readOfficeLink,makeOfficeLink}=await helpers();const offices=await data();
  const regions=vm.runInNewContext((await load("data.js"))+"\nNEPAL_REGIONS");
  const url=makeOfficeLink("https://example.com/publicinfohub/?ref=friend#categories",{search:"Banepa",category:"Local Government",province:"Bagmati",district:"Kavrepalanchok",level:"Local"});
  assert.equal(new URL(url).pathname,"/publicinfohub/");
  assert.equal(new URL(url).hash,"#offices");
  assert.equal(new URL(url).searchParams.get("ref"),"friend");
  const filters=readOfficeLink(new URL(url).search,offices,regions);
  assert.deepEqual(JSON.parse(JSON.stringify(filters)),{search:"Banepa",category:"Local Government",province:"Bagmati",district:"Kavrepalanchok",level:"Local"});
});

test("invalid province, category and district values safely default",async()=>{
 const {readOfficeLink}=await helpers(),offices=await data();
 const regions=vm.runInNewContext((await load("data.js"))+"\nNEPAL_REGIONS");
 const p=readOfficeLink("?province=Atlantis&district=Fake&category=Internal&level=Unknown&office="+encodeURIComponent("a".repeat(170)),offices,regions);
 assert.equal(p.province,"All");assert.equal(p.district,"All");assert.equal(p.category,"All");assert.equal(p.level,"All");assert.equal(p.search.length,120);
 const mismatch=readOfficeLink("?province=Koshi&district=Kavrepalanchok",offices,regions);
 assert.equal(mismatch.district,"All");
});

test("sharing defaults keeps a clean URL and does not alter office data",async()=>{
 const {makeOfficeLink}=await helpers();
 const url=makeOfficeLink("https://example.com/publicinfohub/?office=old&province=Koshi",{search:"",category:"All",province:"All",district:"All",level:"All"});
 assert.equal(url,"https://example.com/publicinfohub/#offices");
 const html=await load("index.html"),script=await load("app.js"),translations=await load("i18n.js");
 assert.ok(html.includes('id="shareOfficeSearch"'));
 assert.ok(html.includes('id="officeShareStatus"'));
 assert.ok(html.includes('src="share.js" defer'));
 assert.ok(html.indexOf('src="share.js"')<html.indexOf('src="app.js"'));
 assert.ok(script.includes('readOfficeLink(window.location.search'));
 assert.ok(script.includes('makeOfficeLink(window.location.href'));
 assert.ok(translations.includes("कार्यालय खोजको लिङ्क प्रतिलिपि गर्नुहोस्"));
});
