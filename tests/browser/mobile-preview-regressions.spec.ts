import { expect, test } from '@playwright/test';

const base = '/akeluwatoolbox';
const widths = [320, 360, 375, 390, 430];

test('stamp editing keeps a live, finger-friendly dock in view across phone widths', async ({ page }) => {
  for (const width of widths) {
    await page.setViewportSize({ width, height: 812 });
    await page.goto(base + '/digital-stamp-maker/');
    // The initial Quick Templates mode hides the classic form. Open it explicitly.
    await page.locator('[data-mode="nepali"]').click();
    const root = page.locator('#stampTool');
    const dock = page.locator('[data-stamp-mobile-dock]');
    const preview = dock.locator('[data-stamp-dock-image]');
    await expect(dock).toBeVisible();
    await expect(preview).toHaveAttribute('src', /^data:image\/svg\+xml/);
    const expandHeight = await dock.locator('[data-stamp-expand]').evaluate(el => el.getBoundingClientRect().height);
    expect(expandHeight, width + 'px expand touch target').toBeGreaterThanOrEqual(44);

    // The preview must remain in the viewport when the user reaches deep controls.
    await page.locator('#stampFontSize').scrollIntoViewIfNeeded();
    await expect(dock).toBeInViewport({ ratio: 0.5 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, width + 'px horizontal overflow').toBeLessThanOrEqual(1);

    const before = await preview.getAttribute('src');
    const input = page.locator('#stampName');
    await input.fill('AKELUWA MOBILE ' + width);
    await expect.poll(() => preview.getAttribute('src')).not.toBe(before);
    await expect(root).toHaveClass(/stamp-mobile-typing/);
    const typedPreviewSize = await preview.evaluate(el => el.getBoundingClientRect().height);
    expect(typedPreviewSize, width + 'px readable typing preview').toBeGreaterThanOrEqual(86);
    await dock.locator('[data-stamp-inline-expand]').click();
    await expect(dock).toHaveClass(/is-enlarged/);
    await expect(dock.locator('[data-stamp-inline-expand]')).toHaveAttribute('aria-pressed', 'true');
    await expect(dock).toBeInViewport({ ratio: 0.5 });
    const bigPreviewSize = await preview.evaluate(el => el.getBoundingClientRect().height);
    expect(bigPreviewSize).toBeGreaterThanOrEqual(125);
    await input.fill('UPDATED MOBILE STAMP ' + width);
    await expect.poll(() => preview.getAttribute('src')).not.toBe(before);
    await dock.locator('[data-stamp-inline-expand]').click();
    await expect(dock.locator('[data-stamp-inline-expand]')).toHaveAttribute('aria-pressed', 'false');
  }
});

test('enlarged stamp image is only retained while the full preview is open', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(base + '/digital-stamp-maker/');
  const dock = page.locator('[data-stamp-mobile-dock]');
  const full = page.locator('[data-stamp-dialog-image]');
  await expect(dock.locator('img')).toHaveAttribute('src', /^data:image\/svg\+xml/);
  await expect(full).not.toHaveAttribute('src', /./);
  await dock.locator('[data-stamp-expand]').click();
  await expect(page.getByRole('dialog', { name: 'Expanded stamp preview' })).toBeVisible();
  await expect(full).toHaveAttribute('src', /^data:image\/svg\+xml/);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Expanded stamp preview' })).not.toBeVisible();
  await expect(full).not.toHaveAttribute('src', /./);
  await expect(dock.locator('img')).toHaveAttribute('src', /^data:image\/svg\+xml/);
});

test('PDF placement and Nepali converter pages avoid horizontal overflow on phones', async ({ page }) => {
  for (const width of widths) {
    await page.setViewportSize({ width, height: 812 });
    for (const route of ['/extra-tools/pdf-page-numbers/', '/extra-tools/unicode-preeti/']) {
      const response = await page.goto(base + route);
      expect(response?.status()).toBe(200);
      await expect(page.locator('#extraLivePanel')).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, route + ' at ' + width + 'px').toBeLessThanOrEqual(1);
    }
  }
});


test('mobile navigation exposes every core tool and supports keyboard dismissal', async ({ page }) => {
  for (const width of [320, 375, 430]) {
    await page.setViewportSize({ width, height: 812 });
    await page.goto(base + '/');
    const toggle = page.getByRole('button', { name: 'Open tools menu' });
    const nav = page.getByRole('navigation', { name: 'Tool navigation' });
    await expect(toggle).toBeVisible();
    await expect(nav).toBeHidden();
    await toggle.click();
    await expect(nav).toBeVisible();
    await expect(page.locator('[data-mobile-tools-toggle]')).toHaveAttribute('aria-expanded', 'true');
    await expect(nav.locator('a[data-tool="stamp"]')).toBeVisible();
    await expect(nav.locator('a[href="/akeluwatoolbox/extra-tools/"]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(nav).toBeHidden();
    await expect(page.locator('[data-mobile-tools-toggle]')).toHaveAttribute('aria-expanded', 'false');
    await page.getByRole('button', { name: 'Open tools menu' }).click();
    await nav.locator('a[data-tool="stamp"]').click();
    await expect(nav).toBeHidden();
    await expect(page).toHaveURL(/\/digital-stamp-maker\/$/);
    await expect(page.locator('#stampTool')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth-window.innerWidth)).toBeLessThanOrEqual(1);
  }
});


test('mobile PDF editor fits each page width while keeping zoom and download functional', async ({ page }) => {
  await page.goto(base + '/pdf-editor/');
  const pdf = Buffer.from(await page.evaluate(async () => {
    const pdfLib = (window as unknown as { PDFLib: { PDFDocument: { create(): Promise<{ addPage(size: number[]): void; save(): Promise<Uint8Array> }> } } }).PDFLib;
    const doc = await pdfLib.PDFDocument.create();
    doc.addPage([595, 842]);
    doc.addPage([842, 595]);
    return Array.from(await doc.save());
  }));
  for (const width of widths) {
    await page.setViewportSize({ width, height: 812 });
    await page.goto(base + '/pdf-editor/');
    await page.locator('#pdfInput').setInputFiles({ name: 'mobile-fit.pdf', mimeType: 'application/pdf', buffer: pdf });
    const stage = page.locator('#pageStage');
    const fit = page.locator('#fitWidthBtn');
    await expect(stage).toBeVisible();
    await expect(fit).toHaveAttribute('aria-pressed', 'true');
    const fitsViewer = () => page.evaluate(() => {
      const wrap = document.getElementById('stageWrap')!;
      const sheet = document.getElementById('pageStage')!;
      const styles = getComputedStyle(wrap);
      const available = wrap.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight);
      return sheet.getBoundingClientRect().width <= available + 2;
    });
    expect(await fitsViewer(), width + 'px first page fit').toBe(true);
    await page.locator('#nextBtn').click();
    await expect(page.locator('#pageReadout')).toHaveText('2 / 2');
    expect(await fitsViewer(), width + 'px landscape page fit').toBe(true);
    await page.locator('#zoomIn').click();
    await expect(fit).toHaveAttribute('aria-pressed', 'false');
    await fit.click();
    await expect(fit).toHaveAttribute('aria-pressed', 'true');
    expect(await fitsViewer(), width + 'px restored fit').toBe(true);
  }
  const downloadEvent = page.waitForEvent('download');
  await page.locator('#exportBtn').click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe('mobile-fit-edited.pdf');
  const bytes = Buffer.from(await (await import('node:fs/promises')).readFile((await download.path())!));
  expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
});
