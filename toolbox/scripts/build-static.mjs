// Publish only browser files, keeping the local Python service out of dist/.
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join, resolve } from 'node:path';
import { pages, site, normalizeOrigin, normalizeBasePath, sitePath, renderPage, escapeHtml } from '../assets/js/seo.js';

const source = fileURLToPath(new URL('../', import.meta.url));
const websiteOutput = resolve(source, 'dist');
const repositoryOutput = resolve(source, '..', 'dist');
const companyOutput = resolve(source, '..', 'public', 'akeluwatoolbox');

export async function buildStatic(outputUrl = new URL('../dist/', import.meta.url), options = {}) {
  const output = resolve(fileURLToPath(outputUrl));
  // Validate the absolute target before deleting generated output.
  if (![websiteOutput, repositoryOutput, companyOutput].includes(output)) {
    throw new Error('Build output must be a dist directory or the company public/akeluwatoolbox directory.');
  }
  const origin = normalizeOrigin(options.origin || process.env.SITE_URL || site.origin);
  const basePath = normalizeBasePath(options.basePath || process.env.SITE_BASE_PATH || '');
  const noindex = process.env.VERCEL_ENV === 'preview';
  const template = await readFile(join(source, 'index.html'), 'utf8');
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  for (const page of pages) {
    const directory = join(output, page.path.slice(1));
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, 'index.html'), renderPage(template, page, origin, noindex, basePath));
  }
  const manifest = JSON.parse(await readFile(join(source, 'site.webmanifest'), 'utf8'));
  for (const field of ['start_url', 'scope']) if (manifest[field]) manifest[field] = sitePath(manifest[field], basePath);
  if (basePath) manifest.scope = basePath + '/';
  for (const icon of manifest.icons || []) if (icon.src.startsWith('/')) icon.src = sitePath(icon.src, basePath);
  await writeFile(join(output, 'site.webmanifest'), JSON.stringify(manifest, null, 2) + '\n');
  // Keep Google's ownership file available at its exact URL in every build.
  await cp(join(source, 'googlefb3975d72926d897.html'), join(output, 'googlefb3975d72926d897.html'));
  await cp(join(source, 'assets'), join(output, 'assets'), { recursive: true });
  await writeFile(join(output, 'robots.txt'), `User-agent: *\n${noindex ? 'Disallow: /' : 'Allow: /'}\n\nSitemap: ${origin}${sitePath('/sitemap.xml', basePath)}\n`);
  await writeFile(join(output, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map(page => `  <url><loc>${escapeHtml(origin + sitePath(page.path, basePath))}</loc></url>`).join('\n')}\n</urlset>\n`);
  await writeFile(join(output, '404.html'), `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Page not found | Akeluwa ToolBox</title><link rel="stylesheet" href="${sitePath('/assets/css/design.css', basePath)}"></head><body><main class="seo-guide"><h1>Page not found</h1><p>Choose a PDF or photo tool from the homepage.</p><a href="${sitePath('/', basePath)}">Open Akeluwa ToolBox</a></main></body></html>`);
  console.log(`Static website built in ${output}: ${(await readdir(output)).join(', ')}`);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  await buildStatic();
}
