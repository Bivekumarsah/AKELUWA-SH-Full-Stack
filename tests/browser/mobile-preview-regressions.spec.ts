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
    await expect(dock).toHaveCSS('max-height', '58px');
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
