import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const base = '/akeluwatoolbox';
const paths = ['/', '/pdf-editor/', '/compress-pdf/', '/compress-photo/', '/pdf-converter/', '/jpg-to-pdf/', '/pdf-to-png/', '/merge-pdf/', '/extract-pdf-pages/', '/remove-background/'];

test('company projects open the toolbox on the same origin, even without the portfolio API', async ({ page }) => {
  await page.route('**/api/v1/portfolio', route => route.fulfill({ status: 503, json: { error: 'Unavailable' } }));
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Software built for');
  const link = page.getByRole('link', { name: 'Open AkeluwaToolBox' });
  await expect(link).toHaveAttribute('href', base + '/');
  await expect(link).not.toHaveAttribute('target', '_blank');
  await link.click();
  await expect(page).toHaveURL(new RegExp(base + '/$'));
  await expect(page.locator('#homeTool')).toBeVisible();
  await page.locator('.tool-tab[data-tool="photo"]').click();
  await expect(page).toHaveURL(new RegExp(base + '/compress-photo/$'));
  await page.reload();
  await expect(page.locator('#photoTool')).toBeVisible();
  await page.goBack({ waitUntil: 'commit' });
  await expect(page.locator('#homeTool')).toBeVisible();
  await page.goto('/case-studies');
  await expect(page.getByRole('link', { name: 'Open AkeluwaToolBox' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('all mounted tool pages and metadata resolve without escaping to company routes', async ({ page, request }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const path of paths) {
    const response = await page.goto(base + path);
    expect(response?.status(), path).toBe(200);
    const alias = await request.get(base + path.slice(0, -1), { maxRedirects: 0 });
    expect(alias.status(), path + ' without slash').toBe(308);
    expect(new URL(alias.headers().location, 'http://localhost').pathname).toBe(base + path);
    const indexAlias = await request.get(base + path + 'index.html', { maxRedirects: 0 });
    expect(indexAlias.status(), path + ' index alias').toBe(308);
    expect(new URL(indexAlias.headers().location, 'http://localhost').pathname).toBe(base + path);
    await expect(page.locator('body')).toHaveAttribute('data-seo-path', base + path);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://www.akeluwasoftwarehub.com.np' + base + path);
    for (const href of await page.locator('.tool-tab, .related-tools a, .breadcrumbs a').evaluateAll(links => links.map(link => link.getAttribute('href')))) {
      expect(href).toMatch(/^\/akeluwatoolbox\//);
    }
  }
  for (const asset of ['/assets/js/seo.js', '/assets/js/pdf-reducer.js', '/assets/js/photo-reducer.js', '/assets/vendor/pdfjs/pdf.min.js', '/assets/vendor/pdfjs/pdf.worker.min.js', '/assets/vendor/pdf-lib/pdf-lib.min.js', '/assets/css/design.css', '/assets/images/logo.png']) {
    const response = await request.get(base + asset);
    expect(response.status(), asset).toBe(200);
    expect(await response.body()).not.toHaveLength(0);
  }
  const manifest = await (await request.get(base + '/site.webmanifest')).json();
  expect((await request.get(base + '/?tool=home')).status()).toBe(200);
  const legacyPhoto = await request.get(base + '/?tool=photo');
  expect(legacyPhoto.status()).toBe(200);
  expect(new URL(legacyPhoto.url()).pathname).toBe(base + '/compress-photo/');
  expect(manifest.start_url).toBe(base + '/');
  expect(manifest.scope).toBe(base + '/');
  expect(manifest.icons[0].src).toMatch(/^\/akeluwatoolbox\//);
  const sitemap = await (await request.get(base + '/sitemap.xml')).text();
  for (const path of paths) expect(sitemap).toContain('https://www.akeluwasoftwarehub.com.np' + base + path);
  const missing = await request.get(base + '/does-not-exist/');
  expect(missing.status()).toBe(404);
  expect(await missing.text()).toContain('Page not found');
  expect((await request.get(base + '/pdf-reducer/manage.py')).status()).toBe(404);
  expect((await request.get(base)).url()).toMatch(/\/akeluwatoolbox\/$/);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(base + '/compress-photo/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('mounted photo and PDF tools download valid output and treat filenames as text', async ({ page }) => {
  await page.goto(base + '/compress-photo/');
  const png = Buffer.from(await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 300; canvas.height = 200;
    const ctx = canvas.getContext('2d')!; ctx.fillStyle = 'green'; ctx.fillRect(0, 0, 300, 200);
    return canvas.toDataURL('image/png').split(',')[1];
  }), 'base64');
  await page.locator('#photoInput').setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: png });
  await expect(page.locator('#photoRun')).toBeEnabled();
  await page.locator('#photoRun').click();
  await expect(page.locator('#photoDownload')).toBeVisible();
  const photoEvent = page.waitForEvent('download');
  await page.locator('#photoDownload').click();
  const photo = await photoEvent;
  expect(photo.suggestedFilename()).toMatch(/\.jpg$/);
  const jpeg = await readFile((await photo.path())!);
  expect(Array.from(jpeg.subarray(0, 2))).toEqual([255, 216]);

  await page.goto(base + '/compress-pdf/');
  const pdf = Buffer.from(await page.evaluate(async () => {
    const lib = (window as unknown as { PDFLib: { PDFDocument: { create(): Promise<{ addPage(): void; save(): Promise<Uint8Array> }> } } }).PDFLib;
    const doc = await lib.PDFDocument.create(); doc.addPage(); return Array.from(await doc.save());
  }));
  await page.locator('#reduceInput').setInputFiles({ name: 'test.pdf', mimeType: 'application/pdf', buffer: pdf });
  await expect(page.locator('#reduceRun')).toBeEnabled();
  await page.locator('#reduceAutomatic').uncheck();
  await page.locator('#reduceRun').click();
  await expect(page.locator('#reduceDownload')).toBeVisible();
  const pdfEvent = page.waitForEvent('download');
  await page.locator('#reduceDownload').click();
  const result = await readFile((await (await pdfEvent).path())!);
  expect(new TextDecoder().decode(result.subarray(0, 5))).toBe('%PDF-');
  expect(result.length).toBeLessThanOrEqual(pdf.length);

  const name = '<img src=x onerror=window.__filenameXss=1>.png';
  await page.goto(base + '/jpg-to-pdf/');
  await page.locator('#imagePdfInput').setInputFiles({ name, mimeType: 'image/png', buffer: png });
  await expect(page.locator('#imageToPdfStatus')).toContainText(name);
  await expect(page.locator('#imageToPdfStatus img')).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { __filenameXss?: number }).__filenameXss)).toBeUndefined();
});
