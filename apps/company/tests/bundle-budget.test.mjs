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
  // The standalone toolbox downloads its PDF engines only after a visitor opens it.
  const toolbox = path.join(process.cwd(), 'dist', 'client', 'akeluwatoolbox') + path.sep;
  const hub = path.join(process.cwd(), 'dist', 'client', 'publicinfohub') + path.sep;
  const files = assets(path.join(process.cwd(), "dist", "client")).filter(file => !file.startsWith(toolbox) && !file.startsWith(hub));
  const javascript = files.filter(file => file.endsWith(".js")).map(file => statSync(file).size);
  const styles = files.filter(file => file.endsWith(".css")).map(file => statSync(file).size);
  const total = [...javascript, ...styles].reduce((sum, size) => sum + size, 0);

  assert.ok(javascript.length > 0 && styles.length > 0, "the production build must emit JS and CSS assets");
  assert.ok(Math.max(...javascript) <= 240 * 1024, "a JavaScript asset exceeds 240 KiB");
  assert.ok(Math.max(...styles) <= 160 * 1024, "a stylesheet exceeds 160 KiB");
  assert.ok(total <= 1024 * 1024, "aggregate JavaScript and CSS exceed 1 MiB");
});

test('toolbox PDF engines and styles remain within their separate download budget', () => {
  const files = assets(path.join(process.cwd(), 'dist', 'client', 'akeluwatoolbox', 'assets'));
  const sizes = files.filter(file => /\.(js|css)$/.test(file)).map(file => statSync(file).size);
  assert.ok(sizes.length > 0);
  assert.ok(Math.max(...sizes) <= 1.5 * 1024 * 1024, 'a toolbox engine exceeds 1.5 MiB');
  assert.ok(sizes.reduce((sum, size) => sum + size, 0) <= 3 * 1024 * 1024, 'toolbox JS and CSS exceed 3 MiB');
});

test('PublicInfoHub static JS and CSS stay within their separate download budget', () => {
  const files = assets(path.join(process.cwd(), 'dist', 'client', 'publicinfohub'));
  const sizes = files.filter(file => /\.(js|css)$/.test(file)).map(file => statSync(file).size);
  assert.ok(sizes.length > 0, 'the imported PublicInfoHub must have its JS and CSS');
  assert.ok(Math.max(...sizes) <= 180 * 1024, 'a PublicInfoHub file exceeds 180 KiB');
  assert.ok(sizes.reduce((sum, size) => sum + size, 0) <= 512 * 1024, 'PublicInfoHub JS/CSS exceed 512 KiB');
});
