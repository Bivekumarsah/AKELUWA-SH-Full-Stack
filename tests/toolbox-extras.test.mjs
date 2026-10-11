import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read=file=>readFile(new URL('../'+file,import.meta.url),'utf8');
const catalog=JSON.parse(await read('toolbox/extra-tools/catalog.json'));
test('Ten added tools do not replace the Company Digital Stamp Maker',async()=>{
 assert.equal(catalog.length,10);
 assert.equal(new Set(catalog.map(x=>x.slug)).size,10);
 const html=await read('toolbox/index.html');
 assert.ok(html.includes('id="stampTool"'));
 assert.ok(html.includes('href="/digital-stamp-maker/"'));
 assert.ok((await read('toolbox/assets/js/stamp-studio.js')).includes('stamp'));
 for(const item of catalog){
  const page=await read('toolbox/extra-tools/'+item.slug+'/index.html');
  assert.ok(html.includes('href="/extra-tools/'+item.slug+'/"'));
  assert.ok(page.includes('data-extra-tool="'+item.slug+'"'));
  assert.ok(page.includes('src="../app.js" defer'));
 }
});
test('Company routing, sitemap, build use isolated extras paths',async()=>{
 const [routing,sitemap,build]=await Promise.all(['next.config.ts','app/sitemap.ts','toolbox/scripts/build-static.mjs'].map(read));
 assert.ok(routing.includes('extraTools.map'));
 assert.ok(routing.includes('destination: toolboxBase + path + "index.html"'));
 assert.ok(sitemap.includes('extraTools.map'));
 assert.ok(build.includes("await cp(join(source, 'extra-tools')"));
 assert.ok(build.includes('extraPaths'));
 assert.ok(build.includes('__TOOLBOX_PUBLIC_ROOT__'));
});
test('Company build publishes canonical links for every new utility',async()=>{
 const sitemap=await read('public/akeluwatoolbox/sitemap.xml');
 for(const item of catalog){
  const page=await read('public/akeluwatoolbox/extra-tools/'+item.slug+'/index.html');
  const canonical='https://www.akeluwasoftwarehub.com.np/akeluwatoolbox/extra-tools/'+item.slug+'/';
  assert.ok(page.includes('href="'+canonical+'"'));
  assert.ok(sitemap.includes(canonical));
 }
});
