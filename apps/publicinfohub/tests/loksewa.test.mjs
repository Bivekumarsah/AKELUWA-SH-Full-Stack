import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
const source=name=>readFile(new URL("../"+name,import.meta.url),"utf8");
test("Federal and seven provincial Lok Sewa listings are source-backed and unique",async()=>{
 const entries=vm.runInNewContext((await source("loksewa-data.js"))+"\nLOKSEWA_PORTALS");
 const regions=vm.runInNewContext((await source("data.js"))+"\nNEPAL_REGIONS");
 assert.equal(entries.length,8);
 assert.equal(new Set(entries.map(x=>x.id)).size,8);
 assert.equal(entries.filter(x=>x.level==="Federal").length,1);
 assert.equal(entries.filter(x=>x.level==="Provincial").length,7);
 assert.deepEqual([...entries.filter(x=>x.level==="Provincial").map(x=>x.province)].sort(),[...regions.map(x=>x.name)].sort());
 for(const entry of entries){
  assert.ok(entry.name&&entry.nameNe&&entry.note);
  assert.equal(new URL(entry.website).protocol,"https:");
  assert.ok(new URL(entry.website).hostname.endsWith(".gov.np"));
  assert.ok(new URL(entry.sourceUrl).hostname.endsWith(".gov.np"));
  if(entry.applyUrl){
   assert.equal(new URL(entry.applyUrl).protocol,"https:");
   assert.ok(new URL(entry.applyUrl).hostname.endsWith(".gov.np"));
  }
 }
 assert.equal(entries.filter(x=>x.applyUrl!==null).length,8);
});
test("All eight supplied official commission login URLs appear",async()=>{
 const entries=vm.runInNewContext((await source("loksewa-data.js"))+"\nLOKSEWA_PORTALS");
 const confirmed=new Map([
  ["federal","https://psconline1.psc.gov.np/#/login"],
  ["koshi","https://psconline.koshi.gov.np/login"],
  ["madhesh","https://ppsconline.p2.gov.np/login"],
  ["bagmati","https://ppsconline.bagamati.gov.np/login"],
  ["gandaki","https://onlineppsc.gandaki.gov.np/login"],
  ["lumbini","https://ppsconline.lumbini.gov.np/login"],
  ["karnali","https://ppsconline.karnali.gov.np/"],
  ["sudurpashchim","https://ppsconline.sudurpashchim.gov.np/"]
 ]);
 for(const entry of entries)assert.equal(entry.applyUrl,confirmed.get(entry.id)||null);
});
test("Lok Sewa UI is bilingual and never collects login credentials",async()=>{
 const [html,js,data,i18n,style,app]=await Promise.all(["index.html","loksewa.js","loksewa-data.js","i18n.js","styles.css","app.js"].map(source));
 for(const id of ["loksewa","loksewaLevel","loksewaProvince","loksewaGrid","loksewaCaution","loksewaGuidance","loksewaLocalDescription"])assert.ok(html.includes('id="'+id+'"'));
 assert.ok(html.includes('href="#loksewa"'));
 assert.ok(html.includes('src="loksewa-data.js" defer'));
 assert.ok(html.includes('src="loksewa.js" defer'));
 assert.ok(html.indexOf('src="app.js"')<html.indexOf('src="loksewa.js"'));
 assert.ok(js.includes('function translateLoksewa()'));
 assert.ok(js.includes('uiLanguage==="ne"'));
 assert.ok(js.includes('target="_blank" rel="noopener noreferrer"'));
 assert.ok(js.includes('item.applyUrl'));
 assert.ok(js.includes('if')||js.includes('?'));
 assert.ok(!html.includes('type="password"'));
 assert.ok(!js.includes('type="password"'));
 assert.ok(!data.includes('password:'));
 assert.ok(i18n.includes('"Lok Sewa":"लोक सेवा"'));
 assert.ok(app.includes('translateLoksewa();'));
 assert.ok(style.includes('.loksewa-grid'));
});
