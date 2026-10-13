import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pages, renderGuide, renderPage, structuredData, sitePath } from '../toolbox/assets/js/seo.js';

const origin = 'https://www.akeluwasoftwarehub.com.np';
const base = '/akeluwatoolbox';
const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');
const extras = JSON.parse(await read('toolbox/extra-tools/catalog.json'));
const guides = JSON.parse(await read('toolbox/scripts/extra-search-guides.json'));
const known = new Set([...pages.map(page => page.path), '/extra-tools/', ...extras.map(x => '/extra-tools/' + x.slug + '/')]);

test('Each primary tool offers original, useful tasks instead of keyword-only doorway URLs', () => {
  assert.equal(pages.length, 11, 'Keep all existing primary tool URLs');
  const uniquePaths = new Set(pages.map(page => page.path));
  assert.equal(uniquePaths.size, pages.length);
  for (const page of pages) {
    assert.ok(page.tasks?.length >= 3, page.path + ' needs meaningful search guidance');
    assert.ok(page.related?.length >= 3, page.path + ' needs contextual next steps');
    const html = renderGuide(page, base);
    assert.ok(html.includes('Common tasks this tool helps with'), page.path);
    assert.ok(html.includes('Continue with a related tool'), page.path);
    assert.ok(html.includes('aria-label="Related file tools"'), page.path);
    for (const target of page.related) {
      assert.ok(known.has(target.path), page.path + ' has a missing related page: ' + target.path);
      assert.notEqual(target.path, page.path, page.path + ' links to itself');
      assert.ok(html.includes('href="' + sitePath(target.path, base) + '"'), page.path + ' broken mount link');
    }
    assert.ok(!html.includes('href="//'), 'Links should not be protocol-relative');
  }
});

test('Public primary pages keep exact canonical, visible tasks and WebApplication metadata', async () => {
  const template = await read('toolbox/index.html');
  for (const page of pages) {
    const rendered = renderPage(template, page, origin, false, base);
    const publicUrl = origin + base + page.path;
    assert.ok(rendered.includes('<link rel="canonical" href="' + publicUrl + '" />'), page.path);
    assert.ok(rendered.includes('<title>' + page.title.replaceAll('&', '&amp;') + '</title>'), page.path);
    assert.ok(rendered.includes('data-seo-noindex="false"'), page.path);
    assert.ok(rendered.includes('Common tasks this tool helps with'), page.path);
    assert.ok(rendered.includes(page.tasks[0].replaceAll('&', '&amp;').replaceAll('>', '&gt;')), page.path + ' visible task content');
    assert.ok(!rendered.includes('href="https://akeluwatoolbox-website.vercel.app'), page.path);
    const graph = structuredData({ ...page, path: base + page.path }, origin, base)['@graph'];
    assert.ok(graph.some(entity => entity['@type'] === 'WebApplication' && entity.url === publicUrl), page.path);
    const notIndexed = renderPage(template, page, origin, true, base);
    assert.ok(notIndexed.includes('name="robots" content="noindex, follow"'), page.path);
  }
});

test('All ten extra utilities have distinct editorial task guidance in published HTML', async () => {
  assert.equal(extras.length, 10);
  assert.equal(Object.keys(guides).length, 10);
  for (const item of extras) {
    const guide = guides[item.slug];
    assert.ok(guide && guide.tasks.length >= 3, item.slug);
    assert.ok(guide.related.length >= 2, item.slug);
    for (const target of guide.related) assert.ok(known.has(target.path), item.slug + ': ' + target.path);
    const html = await read('public/akeluwatoolbox/extra-tools/' + item.slug + '/index.html');
    const url = origin + base + '/extra-tools/' + item.slug + '/';
    assert.ok(html.includes('href="' + url + '"'), item.slug + ' canonical');
    assert.ok(html.includes('Common tasks and practical tips'), item.slug);
    assert.ok(html.includes(guide.tasks[0].replaceAll('&', '&amp;')), item.slug + ' visible guidance');
    assert.ok(html.includes('Related tools for the next step'), item.slug);
    assert.ok(!html.includes('__TOOLBOX_PUBLIC_ROOT__'), item.slug);
    for (const target of guide.related) assert.ok(html.includes('href="' + base + target.path + '"'), item.slug + ' related links');
  }
});

test('Sitemaps list each real canonical tool URL once without false modification times', async () => {
  const [xml, robots, rootSitemap] = await Promise.all([
    read('public/akeluwatoolbox/sitemap.xml'),
    read('public/akeluwatoolbox/robots.txt'),
    read('app/sitemap.ts'),
  ]);
  const routes = [...known].map(path => origin + base + path);
  for (const url of routes) {
    const needle = '<loc>' + url + '</loc>';
    assert.equal(xml.split(needle).length - 1, 1, url + ' must appear once in sitemap');
  }
  assert.ok(robots.includes('Sitemap: ' + origin + base + '/sitemap.xml'));
  assert.ok(rootSitemap.includes('toolboxRoutes.map') && rootSitemap.includes('extraTools.map'));
  assert.ok(!rootSitemap.includes('lastModified: now'), 'Avoid invented modification dates');
});
