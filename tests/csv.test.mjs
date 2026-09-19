import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";

const source = stripTypeScriptTypes(await readFile(new URL("../app/lib/csv.ts", import.meta.url), "utf8"));
const { serializeCSV } = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);

test("CSV export neutralizes user formulas while preserving numeric values", () => {
  assert.equal(serializeCSV([["=1+1", " +SUM(A1)", "@SUM(A1)", "-1+2", "\tvalue", -12]]),
    '"\'=1+1","\' +SUM(A1)","\'@SUM(A1)","\'-1+2","\'\tvalue","-12"');
});
test("CSV export preserves quotes, commas, and multiline messages", () => {
  assert.equal(serializeCSV([['A "quote", here', 'line one\nline two'], ['plain', 42]]),
    '"A ""quote"", here","line one\nline two"\r\n"plain","42"');
});
