import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import test from "node:test";

const read=name=>readFile(new URL("../"+name,import.meta.url),"utf8");
const load=async()=>runInNewContext(
  (await read("office-discovery.js"))+"\n({sortDirectoryOffices})",
  {}
);
const records=[
  {id:"2",name:"Lalitpur Office",nameNe:"ललितपुर",province:"Bagmati",district:"Lalitpur",checkedOn:"2026-10-01"},
  {id:"1",name:"Koshi Office",nameNe:"कोशी",province:"Koshi",district:"Morang",checkedOn:"2026-10-07"},
  {id:"3",name:"Kathmandu Office",nameNe:"काठमाडौं",province:"Bagmati",district:"Kathmandu",checkedOn:"2026-09-18"}
];

test("office sorting is alphabetical by default and never mutates source data",async()=>{
  const {sortDirectoryOffices}=await load();
  const snapshot=JSON.stringify(records);
  assert.deepEqual(Array.from(sortDirectoryOffices(records,"name","en"),r=>r.id),["3","1","2"]);
  assert.deepEqual(Array.from(sortDirectoryOffices(records,"unknown","en"),r=>r.id),["3","1","2"]);
  assert.equal(JSON.stringify(records),snapshot);
});

test("office sorting by province and checked date is deterministic",async()=>{
  const {sortDirectoryOffices}=await load();
  assert.deepEqual(Array.from(sortDirectoryOffices(records,"province","en"),r=>r.id),["3","2","1"]);
  assert.deepEqual(Array.from(sortDirectoryOffices(records,"checked","en"),r=>r.id),["1","2","3"]);
  assert.deepEqual(Array.from(sortDirectoryOffices(records,"name","ne"),r=>r.id).sort(),["1","2","3"]);
});

test("search shortcuts open actual filtered services and office ordering is accessible",async()=>{
  const [html,app,css]=await Promise.all(["index.html","app.js","styles.css"].map(read));
  assert.ok(html.includes('data-quick-search="passport"'));
  assert.ok(html.includes('data-quick-search="pan"'));
  assert.ok(app.includes('document.querySelectorAll("[data-quick-search]")'));
  assert.ok(app.includes('query=phrase.trim().toLocaleLowerCase()'));
  assert.ok(html.includes('id="officeSort"'));
  for(const option of ['value="name"','value="province"','value="checked"'])assert.ok(html.includes(option));
  assert.ok(app.includes('sortDirectoryOffices(GOVERNMENT_OFFICES.filter('));
  assert.ok(app.includes('updateOfficeSortLabels()'));
  assert.ok(css.includes(".office-sort-label"));
});
