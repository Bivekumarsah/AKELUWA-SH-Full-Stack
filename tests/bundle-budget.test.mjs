import assert from "node:assert/strict";
import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";

function assets(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? assets(target) : [target];
  });
}

test("production client assets remain inside performance budgets", () => {
  const files = assets(path.join(process.cwd(), "dist", "client"));
  const javascript = files.filter(file => file.endsWith(".js")).map(file => statSync(file).size);
  const styles = files.filter(file => file.endsWith(".css")).map(file => statSync(file).size);
  const total = [...javascript, ...styles].reduce((sum, size) => sum + size, 0);

  assert.ok(javascript.length > 0 && styles.length > 0, "the production build must emit JS and CSS assets");
  assert.ok(Math.max(...javascript) <= 240 * 1024, "a JavaScript asset exceeds 240 KiB");
  assert.ok(Math.max(...styles) <= 160 * 1024, "a stylesheet exceeds 160 KiB");
  assert.ok(total <= 1024 * 1024, "aggregate JavaScript and CSS exceed 1 MiB");
});
