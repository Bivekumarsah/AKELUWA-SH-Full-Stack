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

test('ZIP writer produces standards-compliant local and central headers for DOCX/images',async()=>{
 const { runInNewContext }=await import('node:vm');
 const code=(await read('toolbox/extra-tools/app.js')).replace('  const tasks={"photo-signature-resizer"', '  window.__zipForTest=zipFiles;\n  const tasks={"photo-signature-resizer"');
 assert.ok(code.includes('window.__zipForTest=zipFiles'));
 const sandbox={document:{body:{dataset:{extraTool:'unit-test'}},getElementById(){return null;}},window:{},TextEncoder,Blob,Uint8Array,URL,console};
 runInNewContext(code,sandbox,{timeout:1000});
 const payload='Hello ZIP',filename='test.txt';
 const archive=await sandbox.window.__zipForTest([{name:filename,data:payload}]);
 const bytes=new Uint8Array(await archive.arrayBuffer());
 const dv=new DataView(bytes.buffer);
 const u16=(offset)=>dv.getUint16(offset,true),u32=(offset)=>dv.getUint32(offset,true);
 assert.equal(u32(0),0x04034b50);
 assert.equal(u16(8),0,'local compression method: store');
 assert.equal(u32(18),payload.length);
 assert.equal(u16(26),filename.length);
 assert.equal(u16(28),0);
 const central=30+filename.length+payload.length;
 assert.equal(u32(central),0x02014b50);
 assert.equal(u16(central+10),0,'central compression method: store');
 assert.equal(u16(central+28),filename.length);
 const end=central+46+filename.length;
 assert.equal(u32(end),0x06054b50);
 assert.equal(u32(end+16),central,'central directory starts at correct offset');
});

test('Resume print CSS keeps preview visible and PNG reports accurate target sizes',async()=>{
 const [css,js]=await Promise.all(['toolbox/extra-tools/style.css','toolbox/extra-tools/app.js'].map(read));
 assert.ok(css.includes('body[data-extra-tool="resume-builder"] .extra-panel > .extra-fields{display:block!important}'));
 assert.ok(css.includes('#cvForm{display:none!important}'));
 assert.ok(js.includes('blob.size<=targetKB*1024'));
 assert.ok(js.includes('drawImageTo(img,img.naturalWidth,img.naturalHeight'));
});

test('Mounted toolbox discovery works with company-prefixed URLs without losing advanced stamp features',async()=>{
 const [home,extra,css,stamp,studio] = await Promise.all([
  read('toolbox/index.html'),read('toolbox/extra-tools/index.html'),
  read('toolbox/assets/css/design.css'),read('toolbox/assets/js/digital-stamp.js'),
  read('toolbox/assets/js/stamp-studio.js')]);
 for(const html of [home,extra]){
  assert.ok(html.includes('id="toolSearch"'));
  assert.ok(html.includes('id="toolSearchCount"'));
  assert.ok(html.includes('tool-finder.mjs'));
 }
 assert.ok(home.includes('id="stampTool"'), 'preserve advanced stamp workspace');
 assert.ok(home.includes('href="/digital-stamp-maker/"'), 'stamp route must stay available');
 assert.ok(stamp.includes('outerSize: 199'), 'advanced ring controls remain present');
 assert.ok(studio.includes('data-undo'), 'advanced stamp studio preserved');
 assert.ok(css.includes('.tool-card[hidden]'));
 const {categoryForPath,matchesTool}=await import('../toolbox/assets/js/tool-finder.mjs');
 assert.equal(categoryForPath('/akeluwatoolbox/digital-stamp-maker/'),'business');
 assert.equal(categoryForPath('/akeluwatoolbox/extra-tools/photo-signature-resizer/'),'images');
 assert.ok(matchesTool({href:'/akeluwatoolbox/digital-stamp-maker/',title:'Digital stamp maker',description:'Create authorized business stamps'},'business stamp','business'));
});

test('Extra-tool URLs are routed by both local worker and the canonical Next.js fallback',async()=>{
 const [worker,route]=await Promise.all([
  read('worker/toolbox.ts'),read('app/akeluwatoolbox/[[...path]]/route.ts')]);
 assert.ok(worker.includes("import extraTools from '../toolbox/extra-tools/catalog.json'"));
 assert.ok(worker.includes("!page && !extra && !isAsset"));
 assert.ok(route.includes('import extraTools from "@/toolbox/extra-tools/catalog.json"'));
 assert.ok(route.includes('page?.path || extra'));
});

test('Mobile stamp preview uses exact SVG from both editors without altering downloads',async()=>{
 const [m,css,home,studio]=await Promise.all([
  read('toolbox/assets/js/mobile-live-preview.mjs'),
  read('toolbox/assets/css/mobile-live-preview.css'),
  read('toolbox/index.html'),
  read('toolbox/assets/js/stamp-studio.js')]);
 assert.ok(m.includes('new MutationObserver(schedule)'));
 assert.ok(m.includes("data:image/svg+xml;charset=utf-8,"));
 assert.ok(m.includes("root.querySelector('[data-ak-studio]')"));
 assert.ok(m.includes("dialog.showModal()"));
 assert.ok(css.includes('position:sticky'));
 assert.ok(css.includes('stamp-mobile-keyboard'));
 assert.ok(home.includes('id="stampPreview"'));
 assert.ok(home.includes('id="downloadStampSvg"'));
 assert.ok(studio.includes('data-preview'));
});

test('All extra utilities have responsive live preview hooks without auto-conversion',async()=>{
 const catalog=JSON.parse(await read('toolbox/extra-tools/catalog.json'));
 const mod=await read('toolbox/assets/js/extra-live-previews.mjs');
 const app=await read('toolbox/extra-tools/app.js');
 const style=await read('toolbox/extra-tools/style.css');
 for(const item of catalog){
  const html=await read('toolbox/extra-tools/'+item.slug+'/index.html');
  assert.ok(html.includes('extra-live-previews.mjs'),item.slug);
 }
 assert.ok(mod.includes('requestAnimationFrame(render)'));
 assert.ok(mod.includes("slug==='pdf-page-numbers'"));
 assert.ok(mod.includes('URL.revokeObjectURL'));
 assert.ok(style.includes('.extra-live-panel'));
 assert.ok(app.includes('byId("fontInput").addEventListener("input",updateText)'));
 assert.ok(app.includes('byId("qrValue").addEventListener("input",schedule)'));
 assert.ok(app.includes('if(shouldDownload)'));
});

test('Core PDF and photo tool previews show settings without processing a file',async()=>{
 const [html,script,css]=await Promise.all([read('toolbox/index.html'),read('toolbox/assets/js/core-live-previews.mjs'),read('toolbox/assets/css/core-live-previews.css')]);
 for(const id of ['reducerTool','photoTool','pdf-to-image','image-to-pdf','merge-pdfs','extract-pages']){
  assert.ok(script.includes("'"+id+"'"),id);
 }
 assert.ok(html.includes('core-live-previews.mjs'));
 assert.ok(script.includes('First-page preview is below'));
 assert.ok(script.includes("get('photoOriginal')"));
 assert.ok(css.includes('position:sticky'));
});
