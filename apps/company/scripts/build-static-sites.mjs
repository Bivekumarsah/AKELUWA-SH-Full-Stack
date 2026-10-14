import { buildStatic } from '../toolbox/scripts/build-static.mjs';
import { cp, mkdir, rm, copyFile } from 'node:fs/promises';

// Single authoritative public ToolBox source: apps/toolbox.
// apps/company/toolbox is a tracked symlink, not a second copy.
await buildStatic(new URL('../public/akeluwatoolbox/', import.meta.url), {
  basePath: '/akeluwatoolbox',
  origin: process.env.TOOLBOX_SITE_URL || 'https://www.akeluwasoftwarehub.com.np',
});

// Rebuild every PublicInfoHub asset from the imported standalone source.
// Never expose repository metadata, scripts, development tests, or hidden files.
const hub = new URL('../../publicinfohub/', import.meta.url);
const output = new URL('../public/publicinfohub/', import.meta.url);
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const directory of ['assets', 'offices', 'utilities']) {
  await cp(new URL(directory + '/', hub), new URL(directory + '/', output), { recursive: true });
}
for (const file of [
  'index.html', 'app.js', 'data.js', 'i18n.js', 'loksewa-data.js',
  'loksewa.js', 'office-discovery.js', 'offices.js', 'share.js',
  'styles.css', 'robots.txt', 'sitemap.xml',
]) {
  await copyFile(new URL(file, hub), new URL(file, output));
}
console.log('Built apps/publicinfohub static files at apps/company/public/publicinfohub.');
