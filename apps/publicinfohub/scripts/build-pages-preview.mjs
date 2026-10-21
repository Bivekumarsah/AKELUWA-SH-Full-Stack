import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
import { join } from "node:path";

// GitHub Pages is an isolated review environment. Only the static site is published.
// Prevent preview indexing while retaining source and production SEO unchanged.
const destination = "_site";
await mkdir(join(destination, "assets"), { recursive: true });
for (const name of ["styles.css", "data.js", "offices.js", "i18n.js", "share.js", "app.js"]) {
  await copyFile(name, join(destination, name));
}
for (const name of ["publicinfohub-logo.webp", "publicinfohub-favicon.webp"]) {
  await copyFile(join("assets", name), join(destination, "assets", name));
}
let html = await readFile("index.html", "utf8");
if (!html.includes('name="robots" content="index,follow,max-image-preview:large"')) {
  throw new Error("Expected SEO robots tag not found; review preview noindex strategy");
}
html = html.replace(
  'name="robots" content="index,follow,max-image-preview:large"',
  'name="robots" content="noindex,nofollow"'
);
await writeFile(join(destination, "index.html"), html);
await writeFile(join(destination, ".nojekyll"), "");
await writeFile(join(destination, "robots.txt"), "User-agent: *\nDisallow: /\n");
