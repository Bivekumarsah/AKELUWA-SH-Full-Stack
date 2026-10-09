import { cp, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { buildStatic } from '../toolbox/scripts/build-static.mjs';

const publicDirectory = new URL('../public/', import.meta.url);

// Keep the existing generated toolbox output within the company deployment.
await buildStatic(new URL('../public/akeluwatoolbox/', import.meta.url), {
  basePath: '/akeluwatoolbox',
  origin: process.env.TOOLBOX_SITE_URL || 'https://www.akeluwasoftwarehub.com.np',
});

// PublicInfoHub is deliberately a separate, dependency-free static prototype.
// Copy only the published browser files; never copy Vercel configuration or docs.
const source = new URL('../publicinfohub/', import.meta.url);
const destination = new URL('publicinfohub/', publicDirectory);
await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
for (const filename of ['index.html', 'styles.css', 'app.js']) {
  await cp(new URL(filename, source), new URL(filename, destination));
}

// Force URL resolution now so missing source files fail before a deployment build.
fileURLToPath(destination);
